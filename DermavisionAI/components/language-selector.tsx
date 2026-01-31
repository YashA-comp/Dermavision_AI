"use client"

import { Globe } from "lucide-react"
import { type Language, languageNames } from "@/lib/translations"

interface LanguageSelectorProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
  compact?: boolean
}

export function LanguageSelector({ currentLanguage, onLanguageChange, compact = false }: LanguageSelectorProps) {
  const languages: Language[] = ["en", "hi", "ta", "te", "bn", "mr"]

  if (compact) {
    return (
      <div className="relative">
        <select
          value={currentLanguage}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          className="appearance-none bg-derma-white/20 backdrop-blur-sm text-derma-teal-dark px-3 py-2 pr-8 rounded-lg border border-derma-cream text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-derma-teal"
        >
          {languages.map((lang) => (
            <option key={lang} value={lang} className="text-derma-teal-dark bg-derma-white">
              {languageNames[lang]}
            </option>
          ))}
        </select>
        <Globe className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-derma-teal-dark pointer-events-none" />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onLanguageChange(lang)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            currentLanguage === lang
              ? "bg-derma-teal-dark text-derma-white shadow-lg"
              : "bg-derma-cream/50 text-derma-teal-dark hover:bg-derma-cream"
          }`}
        >
          {languageNames[lang]}
        </button>
      ))}
    </div>
  )
}
