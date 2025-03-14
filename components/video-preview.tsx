"use client"

import type React from "react"

import { useEffect, useRef, type RefObject, useState } from "react"
import { Play, Pause } from "lucide-react"
import type { ZoomEffect } from "@/lib/types"
import { formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface VideoPreviewProps {
  videoSrc: string
  videoRef: RefObject<HTMLVideoElement>
  canvasRef: RefObject<HTMLCanvasElement>
  currentTime: number
  zoomEffects: ZoomEffect[]
  isPlaying: boolean
  onTimeUpdate: () => void
  onVideoLoad: () => void
  onSeek?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function VideoPreview({
  videoSrc,
  videoRef,
  canvasRef,
  currentTime,
  zoomEffects,
  isPlaying,
  onTimeUpdate,
  onVideoLoad,
  onSeek,
}: VideoPreviewProps) {
  const animationRef = useRef<number>()
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const lastTimeRef = useRef<number>(0)
  const lastVideoTimeRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const [renderStats, setRenderStats] = useState({ fps: 0, drops: 0 })
  const statsIntervalRef = useRef<NodeJS.Timeout>()
  
  // Store previous zoom state to interpolate between frames
  const prevZoomStateRef = useRef<{
    zoom: number;
    centerX: number;
    centerY: number;
  } | null>(null)

  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext("2d", {
        alpha: false,
        willReadFrequently: false,
      })
    }

    // Pre-calculate canvas dimensions once video is loaded
    const setCanvasDimensions = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Add hardware acceleration hints
        canvas.style.transform = "translateZ(0)"
        canvas.style.backfaceVisibility = "hidden"
      }
    }

    if (videoRef.current) {
      if (videoRef.current.readyState >= 2) {
        setCanvasDimensions()
      } else {
        videoRef.current.addEventListener("loadeddata", setCanvasDimensions)
      }
    }

    // Setup stats tracking
    statsIntervalRef.current = setInterval(() => {
      setRenderStats({
        fps: frameCountRef.current,
        drops: 0, // We'll implement drop counting if needed
      })
      frameCountRef.current = 0
    }, 1000)

    // Calculate zoom parameters for a given time
    const calculateZoomParameters = (time: number) => {
      // Find active zoom effect at current time
      const activeEffect = zoomEffects.find(
        (effect) => time >= effect.startTime && time <= effect.startTime + effect.duration
      )

      if (!activeEffect) {
        return {
          zoom: 1,
          centerX: 0.5,
          centerY: 0.5,
          isActive: false
        }
      }

      // Calculate progress through the effect (0 to 1)
      const progress = (time - activeEffect.startTime) / activeEffect.duration
      
      // Create a bell curve for zoom in/out effect with much smoother easing
      let zoomProgress = 0
      
      // Match zoom style if implemented
      const zoomStyle = activeEffect.zoomStyle || 'in-out'
      
      // Cubic bezier easing for smooth transitions
      const easeInOutCubic = (t: number) => 
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        
      if (zoomStyle === 'in-out') {
        // Bell curve - zoom in then out
        if (progress < 0.5) {
          // First half - zoom in with easing
          zoomProgress = easeInOutCubic(progress * 2)
        } else {
          // Second half - zoom out with easing
          zoomProgress = easeInOutCubic((1 - progress) * 2)
        }
      } else if (zoomStyle === 'in-only') {
        // Just zoom in
        zoomProgress = easeInOutCubic(progress)
      } else if (zoomStyle === 'out-only') {
        // Just zoom out
        zoomProgress = easeInOutCubic(1 - progress)
      }

      // Calculate current zoom level based on progress
      const zoom = 1 + (activeEffect.level - 1) * zoomProgress

      return {
        zoom,
        centerX: activeEffect.centerX,
        centerY: activeEffect.centerY,
        isActive: true
      }
    }
    
    // Improved interpolation between frames
    const interpolateZoomState = (current: {zoom: number, centerX: number, centerY: number}, 
                                  previous: {zoom: number, centerX: number, centerY: number} | null,
                                  factor: number = 0.3) => {
      if (!previous) return current
      
      return {
        zoom: previous.zoom + (current.zoom - previous.zoom) * factor,
        centerX: previous.centerX + (current.centerX - previous.centerX) * factor,
        centerY: previous.centerY + (current.centerY - previous.centerY) * factor
      }
    }

    // Optimized render function with precise timing control
    const renderFrame = (timestamp: number) => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = contextRef.current

      if (!video || !canvas || !ctx) {
        animationRef.current = requestAnimationFrame(renderFrame)
        return
      }

      // Calculate time delta for consistent animations regardless of frame rate
      const timeDelta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      
      // Handle video time updates more smoothly
      const videoTimeDelta = video.currentTime - lastVideoTimeRef.current
      lastVideoTimeRef.current = video.currentTime
      
      // Calculate zoom parameters based on current time
      const currentParams = calculateZoomParameters(video.currentTime)
      
      // Apply smooth interpolation between frames for smoother transitions
      // We'll apply stronger interpolation when scrubbing vs. during playback
      const interpolationFactor = Math.abs(videoTimeDelta) > 0.1 ? 0.8 : 0.3
      const smoothedParams = interpolateZoomState(
        currentParams, 
        prevZoomStateRef.current,
        interpolationFactor
      )
      
      // Store current state for next frame's interpolation
      prevZoomStateRef.current = smoothedParams

      // Only clear and redraw if necessary
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (currentParams.isActive) {
        // Apply zoom transformation with interpolation for smoothness
        const centerX = smoothedParams.centerX * canvas.width
        const centerY = smoothedParams.centerY * canvas.height
        const zoomLevel = smoothedParams.zoom

        ctx.save()

        // Apply hardware-accelerated transforms
        ctx.translate(centerX, centerY)
        ctx.scale(zoomLevel, zoomLevel)
        ctx.translate(-centerX, -centerY)

        // High quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()
      } else {
        // No zoom effect, draw video normally
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      }

      // Track frame count for performance monitoring
      frameCountRef.current++

      // Request next animation frame
      animationRef.current = requestAnimationFrame(renderFrame)
    }

    // Start the animation loop immediately
    animationRef.current = requestAnimationFrame(renderFrame)

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (videoRef.current) {
        videoRef.current.removeEventListener("loadeddata", setCanvasDimensions)
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
      }
    }
  }, [videoRef, canvasRef, zoomEffects])

  // Listen for time updates to ensure smooth animation during playback
  useEffect(() => {
    const handleTimeUpdateEvent = () => {
      // By calling onTimeUpdate, we ensure the parent component gets updated time
      // but we don't redraw here - that happens in the animation loop
      onTimeUpdate()
    }
    
    const video = videoRef.current
    if (video) {
      // Use a more frequent timeupdate event for smoother animations
      video.addEventListener("timeupdate", handleTimeUpdateEvent)
    }
    
    return () => {
      if (video) {
        video.removeEventListener("timeupdate", handleTimeUpdateEvent)
      }
    }
  }, [videoRef, onTimeUpdate])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (video) {
      if (video.paused) {
        video.play()
      } else {
        video.pause()
      }
    }
  }

  return (
    <div className="relative">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        <video
          ref={videoRef}
          src={videoSrc}
          className="hidden"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onVideoLoad}
        />

        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 text-white px-4">
          <input
            type="range"
            min="0"
            max={videoRef.current?.duration || 0}
            step="0.01"
            value={currentTime}
            onChange={onSeek}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(currentTime / (videoRef.current?.duration || 1)) * 100}%, #4b5563 ${(currentTime / (videoRef.current?.duration || 1)) * 100}%, #4b5563 100%)`,
            }}
          />
          <div className="flex justify-between items-center w-full">
            <Button
              onClick={togglePlayPause}
              variant="outline"
              size="icon"
              className="bg-black/50 border-none hover:bg-black/70"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}