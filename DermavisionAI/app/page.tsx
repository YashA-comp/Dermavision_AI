"use client"

import type React from "react"
import { useState, useRef, useCallback, memo } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Upload,
  X,
  Stethoscope,
  FileText
} from "lucide-react"
import { type Language, translations } from "@/lib/translations"
import { LanguageSelector } from "@/components/language-selector"
import { SplashScreen } from "@/components/splash-screen"
import Image from "next/image"
import { InformationPage } from "@/components/information-page"
import { AboutPage } from "@/components/about-page"
import SkinScanner from "@/components/SkinScanner"
// 1. Import the Gradio Client
import { Client } from "@gradio/client";

// Red flag symptom suggestions
const RED_FLAG_SUGGESTIONS = [
  "Bleeding", "Itching", "Fast Growth", "Pain", "Color Changes",
  "Irregular Borders", "Asymmetrical", "Oozing", "Non-healing",
  "Scaly", "Raised", "Tender"
]

type Screen = "landing" | "scan" | "triage" | "results" | "information" | "about"

interface ScanSession {
  symptoms: string[]
  risk_score: number
  image_url: string | null
  // 2. Added field to store your Vision Model's output
  vision_result?: { label: string; confidences: { label: string; confidence: number }[] } | null
  llm_report?: string
  error?: string
}

// --- HELPER: Convert Base64 to Blob for Gradio ---
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return await res.blob();
}

// Memoized TriagePage
const TriagePage = memo(({ 
  symptomsInput,
  handleSymptomsChange,
  toggleSymptom,
  removeSymptomsTag,
  proceedToResults,
  isAnalyzingVision, // New prop to show loading state
  t
}: {
  symptomsInput: string
  handleSymptomsChange: (text: string) => void
  toggleSymptom: (symptom: string) => void
  removeSymptomsTag: (idx: number) => void
  proceedToResults: () => void
  isAnalyzingVision: boolean
  t: any
}) => (
  <div className="min-h-screen bg-derma-yellow/20 flex flex-col">
    <header className="p-6 bg-derma-white shadow-sm border-b border-derma-cream">
      <h2 className="text-2xl font-bold text-black">{t.symptomAssessment}</h2>
    </header>
    <main className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Vision Status Indicator */}
      <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${isAnalyzingVision ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
        {isAnalyzingVision ? (
          <>
            <Activity className="w-4 h-4 animate-spin" />
            Analyzing image with AI Model...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Image Analysis Complete
          </>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-black">{t.clinicalSymptoms}</h3>
        <p className="text-sm text-gray-600">Describe your symptoms in detail, or select from suggestions below:</p>
        
        <div className="relative">
          <textarea
            value={symptomsInput}
            onChange={(e) => handleSymptomsChange(e.target.value)}
            placeholder="e.g., Itching, redness, bleeding, fast growth..."
            className="w-full p-4 border-2 border-derma-teal/30 rounded-xl focus:border-derma-teal focus:outline-none resize-none transition-all"
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Quick suggestions - Click to add:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {RED_FLAG_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => toggleSymptom(suggestion)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  symptomsInput.includes(suggestion)
                    ? "bg-derma-teal text-white border-derma-teal"
                    : "bg-white border-2 border-derma-teal/30 text-black hover:border-derma-teal"
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {symptomsInput && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Entered symptoms:</p>
            <div className="flex flex-wrap gap-2">
              {symptomsInput.split(",").map((symptom, idx) => {
                const trimmed = symptom.trim();
                return trimmed ? (
                  <div key={`symptom-${idx}`} className="bg-derma-teal/20 border border-derma-teal text-black px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {trimmed}
                    <button onClick={() => removeSymptomsTag(idx)} className="text-derma-teal hover:text-derma-teal-dark font-bold">×</button>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </main>
    <div className="p-6 bg-white border-t">
      <button 
        onClick={proceedToResults} 
        disabled={isAnalyzingVision} // Prevent proceeding until vision is done
        className="btn-primary w-full bg-derma-teal-dark text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzingVision ? "Waiting for AI..." : t.generateReport} 
        {!isAnalyzingVision && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  </div>
))

export default function DermaVisionApp() {
  const [language, setLanguage] = useState<Language>("en")
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // New state to track Vision Model status
  const [isVisionLoading, setIsVisionLoading] = useState(false)

  const [scanSession, setScanSession] = useState<ScanSession>({
    symptoms: [],
    risk_score: 0,
    image_url: null,
    vision_result: null
  })
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [symptomsInput, setSymptomsInput] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = translations[language]

  const navigateToScreen = (screen: Screen) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentScreen(screen)
      setIsTransitioning(false)
    }, 300)
  }

  // --- 3. VISION AI FUNCTION (Hugging Face) ---
  const analyzeWithVisionAI = async (imageSrc: string) => {
    setIsVisionLoading(true);
    try {
      // Convert base64 to Blob for the API
      const blob = await base64ToBlob(imageSrc);
      
      console.log("Connecting to Hugging Face Model...");
      const app = await Client.connect("Heckur0009/dermascan-api"); // Your Space
      
      console.log("Sending image...");
      const result = await app.predict("/predict", [blob]) as { data: any[] };
      
      console.log("Vision AI Result:", result.data);
      
      // Store the raw result in state
      setScanSession((prev) => ({
        ...prev,
        vision_result: result.data[0] as any 
      }));

    } catch (error) {
      console.error("Vision AI Failed:", error);
      alert("AI Model connection failed. Continuing with basic analysis.");
    } finally {
      setIsVisionLoading(false);
    }
  };

  // --- 4. IMAGE CAPTURE HANDLER ---
  const performAnalysis = async (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setScanSession((prev) => ({ ...prev, image_url: imageSrc }));
    
    // Start Vision Analysis IMMEDIATELY in the background
    // We don't await this here, so the user can go to the next screen immediately
    analyzeWithVisionAI(imageSrc); 
    
    navigateToScreen("triage");
  }

  const handleWebcamCapture = (imageSrc: string) => performAnalysis(imageSrc);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const result = event.target?.result as string
        performAnalysis(result);
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleSymptom = useCallback((symptom: string) => {
    setSymptomsInput((prev) => {
      if (prev.includes(symptom)) {
        return prev.replace(symptom, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim()
      } else {
        return prev ? `${prev}, ${symptom}` : symptom
      }
    })
  }, [])

  const handleSymptomsChange = useCallback((text: string) => {
    setSymptomsInput(text)
  }, [])

  const removeSymptomsTag = useCallback((idx: number) => {
    setSymptomsInput((prev) => prev.split(",").filter((_, i) => i !== idx).join(","))
  }, [])

  const proceedToResults = async () => {
    const symptoms = symptomsInput.split(",").map((s) => s.trim()).filter((s) => s);
    
    if (symptoms.length === 0) {
      alert("Please enter at least one symptom");
      return;
    }

    // Update session with symptoms
    setScanSession((prev) => ({ ...prev, symptoms: symptoms }));
    navigateToScreen("results");
    
    // --- 5. TRIGGER HYBRID LLM REPORT ---
    // We wait 500ms for the UI to settle, then call the backend
    setTimeout(async () => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: capturedImage,
            symptoms: symptoms,
            // Pass the vision result we got earlier!
            visionAnalysis: scanSession.vision_result 
          })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();

        if (data.result) {
          setScanSession(prev => ({ ...prev, llm_report: data.result }));
        }
      } catch (error: any) {
        console.error("LLM Error", error);
        setScanSession(prev => ({ ...prev, error: error.message }));
      }
    }, 500);
  }

  const resetSession = () => {
    setScanSession({ symptoms: [], risk_score: 0, image_url: null, vision_result: null })
    setSymptomsInput("")
    setCapturedImage(null)
    setIsAnalyzing(false)
    setIsVisionLoading(false)
    navigateToScreen("landing")
  }

  // --- UI COMPONENTS ---
  const LandingPage = () => (
    <div className="min-h-screen bg-derma-white flex flex-col relative">
      <div className="absolute inset-0 z-0 opacity-30 bg-[url('/images/hospital-bg.png')] bg-cover bg-center" />
      <header className="p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Image src="/images/dermavision-logo.png" alt="Logo" width={48} height={48} className="rounded-xl shadow-md" />
          <span className="text-2xl font-bold text-derma-teal-dark">DermaVision AI</span>
        </div>
        <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} compact />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative z-10">
        <div className="max-w-md w-full space-y-8 text-center">
          <h2 className="text-4xl font-extrabold text-black">{t.heroTitle}</h2>
          <p className="text-lg text-gray-700">{t.heroSubtitle}</p>
          <button onClick={() => navigateToScreen("scan")} className="btn-primary w-full bg-derma-teal-dark text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">
            {t.startScan} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  )

  const ScanPage = () => (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="p-4 flex items-center justify-between bg-black/30 backdrop-blur-sm z-50">
        <button onClick={() => navigateToScreen("landing")} className="text-white p-2"><X className="w-6 h-6" /></button>
        <h2 className="text-white font-bold">{t.captureLesion}</h2>
      </header>
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          <SkinScanner onCapture={handleWebcamCapture} />
          <div className="my-6 w-full max-w-md flex items-center gap-2 text-gray-500 text-sm">
             <div className="h-px bg-gray-700 flex-1" /> OR <div className="h-px bg-gray-700 flex-1" />
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} className="btn-secondary w-full max-w-md bg-gray-800 text-white py-4 rounded-xl font-bold text-lg border border-gray-700 shadow-lg flex items-center justify-center gap-2">
            {isAnalyzing ? <Activity className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {isAnalyzing ? "Analyzing..." : t.uploadGallery}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>
    </div>
  )

  const ResultsPage = () => {
    // ... (PDF Download Logic remains the same as your original)
    const downloadPDF = () => {
        // Copied from your original logic for brevity
        if (!scanSession.llm_report) { alert("No analysis available"); return; }
        const element = document.createElement('div');
        element.innerHTML = `<h1>DermaVision AI Report</h1><p>${scanSession.llm_report.replace(/\n/g, '<br />')}</p>`;
        const printWindow = window.open('', '', 'height=600,width=800');
        if(printWindow) {
            printWindow.document.write(`<html><body>${element.innerHTML}</body></html>`);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
      <div className="min-h-screen bg-derma-cream/30 flex flex-col">
        <header className="p-6 bg-white shadow-sm border-b border-derma-cream">
          <h2 className="text-2xl font-bold text-black">{t.riskAssessment}</h2>
        </header>
        <main className="flex-1 p-6 space-y-6 overflow-y-auto pb-32">
          
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-md border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold text-indigo-900">Final Verdict</h3>
            </div>
            
            {!scanSession.llm_report ? (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-semibold">Generating Medical Report...</p>
                <p className="text-gray-500 text-xs">Integrating Vision Model results with your symptoms...</p>
              </div>
            ) : (
              <div className="bg-white/60 p-6 rounded-xl">
                <div className="whitespace-pre-wrap text-gray-800 text-base leading-relaxed">{scanSession.llm_report}</div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs text-gray-700">
              <strong>Disclaimer:</strong> Educational purposes only. Consult a dermatologist.
            </p>
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t space-y-3">
          <button 
            onClick={downloadPDF} 
            disabled={!scanSession.llm_report}
            className="w-full bg-derma-teal text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileText className="w-5 h-5" />
            Download PDF Report
          </button>
          <button onClick={resetSession} className="btn-primary w-full bg-derma-teal-dark text-white py-4 rounded-xl font-bold">{t.newScan}</button>
        </div>
      </div>
    )
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "landing": return <LandingPage />
      case "scan": return <ScanPage />
      case "triage": return <TriagePage 
        symptomsInput={symptomsInput}
        handleSymptomsChange={handleSymptomsChange}
        toggleSymptom={toggleSymptom}
        removeSymptomsTag={removeSymptomsTag}
        proceedToResults={proceedToResults}
        isAnalyzingVision={isVisionLoading} // Pass status to triage
        t={t}
      />
      case "results": return <ResultsPage />
      case "information": return <InformationPage onBack={() => navigateToScreen("landing")} />
      case "about": return <AboutPage onBack={() => navigateToScreen("landing")} />
      default: return <LandingPage />
    }
  }

  return <SplashScreen><div className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>{renderScreen()}</div></SplashScreen>
}