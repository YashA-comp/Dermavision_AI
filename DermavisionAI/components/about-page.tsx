"use client"

import { ArrowLeft, Shield, Brain, Users, Target, Heart, Award } from "lucide-react"
import Image from "next/image"

interface AboutPageProps {
  onBack: () => void
}

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Advanced machine learning models trained on thousands of dermatological images to identify potential skin conditions.",
  },
  {
    icon: Shield,
    title: "Safety-First Approach",
    description: "Built-in safety veto system that escalates risk assessment when critical symptoms are detected.",
  },
  {
    icon: Target,
    title: "Multi-Tier Classification",
    description: "Comprehensive analysis covering 11 different skin condition categories for thorough screening.",
  },
  {
    icon: Users,
    title: "Multilingual Support",
    description: "Available in 6 languages including English, Hindi, Tamil, Telugu, Bengali, and Marathi.",
  },
]

const team = [
  { role: "AI/ML Development", description: "Computer vision and deep learning models" },
  { role: "Medical Advisory", description: "Dermatology expertise and clinical validation" },
  { role: "User Experience", description: "Accessible design for diverse users" },
  { role: "Data Privacy", description: "Secure handling of sensitive health data" },
]

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-derma-white">
      {/* Header */}
      <header className="bg-derma-teal-dark text-white p-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Go back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">About DermaVision AI</h1>
            <p className="text-white/70 text-sm">AI-powered skin disease screening and risk assessment</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center py-8">
          <Image
            src="/images/dermavision-logo.png"
            alt="DermaVision AI Logo"
            width={120}
            height={120}
            className="mx-auto rounded-3xl shadow-xl mb-6"
          />
          <h2 className="text-3xl font-bold text-derma-teal-dark mb-4">Making Skin Health Accessible</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            DermaVision AI combines advanced artificial intelligence with clinical symptom assessment to provide
            preliminary skin disease screening, helping users make informed decisions about seeking professional medical
            care.
          </p>
        </div>

        {/* Mission */}
        <div
          className="bg-gradient-to-r from-derma-teal to-derma-teal-dark rounded-2xl p-8 text-white"
        >
          <div className="flex items-start gap-4">
            <Heart className="w-10 h-10 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-bold mb-3">Our Mission</h3>
              <p className="text-white/90 text-lg">
                To democratize access to preliminary skin health screening through AI technology, enabling early
                detection and timely medical intervention, especially in underserved communities where dermatologists
                may not be readily available.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h3 className="text-2xl font-bold text-derma-teal-dark mb-6 text-center">Key Features</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-lg border border-derma-cream"
              >
                <feature.icon className="w-10 h-10 text-derma-teal mb-4" />
                <h4 className="text-lg font-bold text-derma-teal-dark mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-derma-cream/50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-derma-teal-dark mb-6 text-center">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-derma-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h4 className="font-bold text-derma-teal-dark mb-2">Capture</h4>
              <p className="text-sm text-gray-600">
                Take a clear photo of the skin area of concern using your device camera
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-derma-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h4 className="font-bold text-derma-teal-dark mb-2">Analyze</h4>
              <p className="text-sm text-gray-600">
                Our AI analyzes the image and you provide symptom information for assessment
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-derma-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h4 className="font-bold text-derma-teal-dark mb-2">Results</h4>
              <p className="text-sm text-gray-600">
                Receive a comprehensive risk assessment with recommended next steps
              </p>
            </div>
          </div>
        </div>

        {/* Team/Expertise */}
        <div>
          <h3 className="text-2xl font-bold text-derma-teal-dark mb-6 text-center">Built With Expertise</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-xl p-4 text-center shadow border border-derma-cream">
                <Award className="w-8 h-8 text-derma-teal mx-auto mb-3" />
                <h4 className="font-semibold text-derma-teal-dark text-sm mb-1">{member.role}</h4>
                <p className="text-xs text-gray-500">{member.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h4 className="font-bold text-amber-800 mb-2">Important Disclaimer</h4>
          <p className="text-amber-700 text-sm">
            DermaVision AI is designed for educational and screening purposes only. It is not intended to replace
            professional medical advice, diagnosis, or treatment. The AI analysis provides preliminary risk assessment
            to help users decide whether to seek professional medical evaluation. Always consult a qualified healthcare
            provider for any medical concerns. Results should not be used as the sole basis for medical decisions.
          </p>
        </div>

        {/* Version Info */}
        <div className="text-center text-gray-400 text-sm py-4">
          <p>DermaVision AI - MVP Version 1.0</p>
          <p>Built with Next.js, Framer Motion, and TailwindCSS</p>
        </div>
      </main>
    </div>
  )
}
