"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import VideoUpload from "./video-upload"
import Timeline from "./timeline"
import ZoomControls from "./zoom-controls"
import VideoPreview from "./video-preview"
import type { ZoomEffect } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function VideoEditor() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [zoomEffects, setZoomEffects] = useState<ZoomEffect[]>([])
  const [selectedEffect, setSelectedEffect] = useState<ZoomEffect | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const updateBufferMsRef = useRef<number>(30) // Larger buffer for UI updates than for rendering

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
  }

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
    }
  }

  // Use a buffered time update to prevent excessive UI updates
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const now = performance.now()
      if (now - lastUpdateTimeRef.current > updateBufferMsRef.current) {
        // Only update the UI state at a reasonable rate
        setCurrentTime(videoRef.current.currentTime)
        lastUpdateTimeRef.current = now
        
        // Dynamically adjust the update buffer based on performance
        // More frequent updates for smoother UI when possible
        if (videoRef.current.paused) {
          // More responsive during scrubbing
          updateBufferMsRef.current = 16 // ~60fps
        } else {
          // Balance smoothness and performance during playback
          updateBufferMsRef.current = 30 // ~30fps
        }
      }
    }
  }, [])

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
        // Reset update timing on play
        lastUpdateTimeRef.current = 0 
      }
      setIsPlaying(!isPlaying)
    }
  }

  const addZoomEffect = (startTime: number) => {
    const newEffect: ZoomEffect = {
      id: Date.now().toString(),
      startTime,
      duration: 3,
      level: 1.5,
      centerX: 0.5,
      centerY: 0.5,
      zoomStyle: "in-out", // Default to zoom in and out
    }
    setZoomEffects([...zoomEffects, newEffect])
    setSelectedEffect(newEffect)
  }

  const updateZoomEffect = (updatedEffect: ZoomEffect) => {
    setZoomEffects(zoomEffects.map((effect) => (effect.id === updatedEffect.id ? updatedEffect : effect)))
    setSelectedEffect(updatedEffect)
  }

  const deleteZoomEffect = (effectId: string) => {
    setZoomEffects(zoomEffects.filter((effect) => effect.id !== effectId))
    if (selectedEffect?.id === effectId) {
      setSelectedEffect(null)
    }
  }

  const handleExport = () => {
    // In a real implementation, this would render the video with effects
    // and create a downloadable file
    alert("Export functionality would be implemented here")
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const seekTime = Number.parseFloat(e.target.value)
      videoRef.current.currentTime = seekTime
      // Update immediately when seeking
      setCurrentTime(seekTime)
      lastUpdateTimeRef.current = 0 // Reset update timing on seek
    }
  }

  if (!videoSrc) {
    return (
      <div className="w-full max-w-4xl bg-gray-900 rounded-lg p-8">
        <VideoUpload onUpload={handleVideoUpload} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-3/4 p-4">
          <VideoPreview
            videoSrc={videoSrc}
            videoRef={videoRef}
            canvasRef={canvasRef}
            currentTime={currentTime}
            zoomEffects={zoomEffects}
            isPlaying={isPlaying}
            onTimeUpdate={handleTimeUpdate}
            onVideoLoad={handleVideoLoad}
            onSeek={handleSeek}
          />
          <div className="mt-4">
            <Timeline
              duration={videoDuration}
              currentTime={currentTime}
              zoomEffects={zoomEffects}
              onAddEffect={addZoomEffect}
              onSelectEffect={setSelectedEffect}
              onUpdateEffect={updateZoomEffect}
              selectedEffect={selectedEffect}
            />
          </div>
        </div>
        <div className="md:w-1/4 bg-gray-800 p-4">
          {selectedEffect ? (
            <ZoomControls effect={selectedEffect} onUpdate={updateZoomEffect} onDelete={deleteZoomEffect} />
          ) : (
            <div className="text-center p-4">
              <p>Select a zoom effect or add a new one on the timeline</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 flex justify-end">
        <Button onClick={handleExport} className="bg-purple-600 hover:bg-purple-700">
          <Download className="mr-2 h-4 w-4" /> Export Video
        </Button>
      </div>
    </div>
  )
}