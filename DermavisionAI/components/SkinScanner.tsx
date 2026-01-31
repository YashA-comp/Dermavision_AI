"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Camera, RefreshCw } from "lucide-react"

interface SkinScannerProps {
  onCapture: (imageSrc: string) => void
}

export default function SkinScanner({ onCapture }: SkinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    let mounted = true

    const initWebcam = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 300, height: 300 }
        })
        
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = mediaStream
          setStream(mediaStream)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Webcam Error:", error)
        if (mounted) setIsLoading(false)
      }
    }

    initWebcam()

    return () => {
      mounted = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 300, 300)
        const imageSrc = canvasRef.current.toDataURL("image/png")
        onCapture(imageSrc)
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative overflow-hidden rounded-2xl border-4 border-derma-teal shadow-2xl bg-black" style={{ width: 300, height: 300 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="hidden"
        />
        
        {isLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
             <RefreshCw className="w-8 h-8 animate-spin text-derma-teal" />
           </div>
        )}
      </div>

      <p className="text-gray-400 mt-4 text-sm">Align skin area within the frame</p>

      <button
        onClick={capture}
        disabled={isLoading}
        className="mt-6 bg-derma-teal hover:bg-derma-teal-dark text-white rounded-full p-6 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Camera className="w-8 h-8" />
      </button>
    </div>
  )
}