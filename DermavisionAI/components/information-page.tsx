"use client"

import { Info, AlertCircle, ArrowLeft } from "lucide-react"

interface InformationPageProps {
  onBack: () => void
}

interface Condition {
  id: string
  name: string
  emoji: string
  description: string
  severity: "low" | "medium" | "high"
}

const conditions: Condition[] = [
  {
    id: "eczema",
    name: "Eczema",
    emoji: "🧴",
    severity: "low",
    description:
      "Eczema is a skin condition that causes red, dry, and itchy patches. It often flares up when exposed to harsh soaps, dust, or stress. It is not contagious and can be controlled with moisturizing creams and gentle skin care.",
  },
  {
    id: "melanoma",
    name: "Melanoma",
    emoji: "☀️",
    severity: "high",
    description:
      "Melanoma is the most serious type of skin cancer. It usually starts as a new dark mole or a change in an existing mole's size, color, or shape. Early detection and treatment are very important because melanoma can spread quickly if ignored.",
  },
  {
    id: "atopic-dermatitis",
    name: "Atopic Dermatitis",
    emoji: "🌿",
    severity: "low",
    description:
      "Atopic dermatitis is a common, long-lasting form of eczema that usually starts in childhood. The skin becomes dry, very itchy, and may crack or bleed. Regular moisturizing and avoiding triggers like dust or sweat can help prevent flare-ups.",
  },
  {
    id: "bcc",
    name: "Basal Cell Carcinoma (BCC)",
    emoji: "🧬",
    severity: "medium",
    description:
      "BCC is the most common type of skin cancer. It often looks like a shiny bump, pink patch, or sore that doesn't heal, usually on sun-exposed areas. It grows slowly and rarely spreads if treated early.",
  },
  {
    id: "moles",
    name: "Melanocytic Nevi (Moles)",
    emoji: "⚫",
    severity: "low",
    description:
      "These are dark spots or growths caused by pigment-producing skin cells. Most moles are harmless, but changes in color, size, or bleeding could signal melanoma. Regular skin checks help detect any early danger signs.",
  },
  {
    id: "bkl",
    name: "Benign Keratosis-Like Lesions (BKL)",
    emoji: "🟤",
    severity: "low",
    description:
      "These are non-cancerous growths that appear rough, scaly, or wart-like. They often develop with age or sun exposure. Though harmless, they can be removed if they itch, irritate, or change appearance.",
  },
  {
    id: "psoriasis",
    name: "Psoriasis / Lichen Planus",
    emoji: "🔴",
    severity: "medium",
    description:
      "Psoriasis causes thick, red skin with white scales, often on elbows, knees, or scalp. Lichen planus creates flat, purple-colored bumps that may itch. Both are not contagious and can be managed with doctor-prescribed creams or light therapy.",
  },
  {
    id: "seborrheic",
    name: "Seborrheic Keratoses",
    emoji: "🌰",
    severity: "low",
    description:
      "Seborrheic keratoses are soft, raised, or waxy spots that can look like stuck-on patches. They are completely harmless and common in older adults. No treatment is needed unless they irritate or for cosmetic removal.",
  },
  {
    id: "tinea",
    name: "Tinea / Ringworm",
    emoji: "⚪",
    severity: "low",
    description:
      "Despite its name, ringworm is a fungal infection, not caused by worms. It forms a red, circular, itchy rash with clear skin in the middle. It spreads by touch, so keeping skin dry and using antifungal creams helps cure it.",
  },
  {
    id: "warts",
    name: "Warts / Molluscum",
    emoji: "🧫",
    severity: "low",
    description:
      "Warts are small, rough bumps caused by HPV, while molluscum appears as smooth, pearl-like bumps. Both spread by skin contact but are not dangerous. They often disappear naturally or can be treated by a dermatologist.",
  },
]

const severityColors = {
  low: "bg-green-50 border-green-200",
  medium: "bg-yellow-50 border-yellow-200",
  high: "bg-red-50 border-red-200",
}

const severityBadges = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
}

export function InformationPage({ onBack }: InformationPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-derma-teal-dark text-white p-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Go back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <Info className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Skin Conditions Guide</h1>
              <p className="text-white/70 text-sm">
                Learn about common skin conditions and when to seek medical attention
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-10">
        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Important Medical Disclaimer</p>
            <p>
              This information is for educational purposes only and should not replace professional medical advice.
              Always consult a qualified dermatologist or healthcare provider for proper diagnosis and treatment.
            </p>
          </div>
        </div>

        {/* Conditions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {conditions.map((condition) => (
            <div
              key={condition.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${severityColors[condition.severity]}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{condition.emoji}</span>
                  <h2 className="font-semibold text-gray-900 text-lg leading-tight">{condition.name}</h2>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${severityBadges[condition.severity]}`}>
                  {condition.severity === "high" ? "Urgent" : condition.severity === "medium" ? "Moderate" : "Mild"}
                </span>
              </div>

              {/* Description */}
              <p className="text-gray-700 text-sm leading-relaxed">{condition.description}</p>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            If you notice any unusual changes in your skin, persistent symptoms, or have concerns about any condition,
            please schedule an appointment with a dermatologist.
          </p>
        </div>
      </div>
    </div>
  )
}
