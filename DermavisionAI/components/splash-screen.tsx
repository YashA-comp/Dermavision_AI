"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"

interface SplashScreenProps {
  children: React.ReactNode
}

export function SplashScreen({ children }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Start fading out splash after 1.5s
    const timer = setTimeout(() => {
      setShowContent(true)
      // Unmount splash after animation completes
      setTimeout(() => {
        setShowSplash(false)
      }, 600)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-600 ${showContent ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`transition-all duration-600 transform ${showContent ? 'scale-115 opacity-0' : 'scale-100 opacity-100'}`}>
            <Image
              src="/images/dermavision-logo.png"
              alt="DermaVision AI"
              width={120}
              height={120}
              priority
              className="rounded-3xl"
            />
          </div>
        </div>
      )}

      <div
        className={`transition-all duration-500 transform ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-96'}`}
      >
        {children}
      </div>
    </>
  )
}
