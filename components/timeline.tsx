"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { ZoomEffect } from "@/lib/types"
import { formatTime } from "@/lib/utils"

interface TimelineProps {
  duration: number
  currentTime: number
  zoomEffects: ZoomEffect[]
  selectedEffect: ZoomEffect | null
  onAddEffect: (time: number) => void
  onSelectEffect: (effect: ZoomEffect | null) => void
  onUpdateEffect: (effect: ZoomEffect) => void
}

export default function Timeline({
  duration,
  currentTime,
  zoomEffects,
  selectedEffect,
  onAddEffect,
  onSelectEffect,
  onUpdateEffect,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedEffect, setDraggedEffect] = useState<string | null>(null)
  const [draggedEdge, setDraggedEdge] = useState<"start" | "end" | null>(null)
  const [timelineWidth, setTimelineWidth] = useState(0)

  // Optimize the timeline rendering by adding a buffer to prevent unnecessary re-renders
  // Add this at the beginning of the component
  const lastRenderTimeRef = useRef<number>(0)
  const RENDER_BUFFER_MS = 16 // Only update visuals every ~16ms (60fps)

  useEffect(() => {
    const updateTimelineWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.clientWidth)
      }
    }

    updateTimelineWidth()
    window.addEventListener("resize", updateTimelineWidth)
    return () => window.removeEventListener("resize", updateTimelineWidth)
  }, [])

  const timeToPosition = (time: number): number => {
    return (time / duration) * timelineWidth
  }

  const positionToTime = (position: number): number => {
    return (position / timelineWidth) * duration
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const clickPosition = e.clientX - rect.left
    const clickTime = positionToTime(clickPosition)

    // Check if we clicked on an existing effect
    const clickedEffect = zoomEffects.find((effect) => {
      const startPos = timeToPosition(effect.startTime)
      const endPos = timeToPosition(effect.startTime + effect.duration)
      return clickPosition >= startPos && clickPosition <= endPos
    })

    if (clickedEffect) {
      onSelectEffect(clickedEffect)
    } else {
      onAddEffect(clickTime)
    }
  }

  const handleEffectMouseDown = (e: React.MouseEvent, effectId: string, edge: "start" | "end" | null = null) => {
    e.stopPropagation()
    setIsDragging(true)
    setDraggedEffect(effectId)
    setDraggedEdge(edge)

    const effect = zoomEffects.find((effect) => effect.id === effectId)
    if (effect) {
      onSelectEffect(effect)
    }
  }

  // Modify the handleMouseMove function to include throttling
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedEffect || !timelineRef.current) return

    const now = performance.now()
    if (now - lastRenderTimeRef.current < RENDER_BUFFER_MS) {
      // Skip this update to maintain performance
      return
    }
    lastRenderTimeRef.current = now

    const rect = timelineRef.current.getBoundingClientRect()
    const mousePosition = e.clientX - rect.left
    const mouseTime = positionToTime(mousePosition)

    const effect = zoomEffects.find((effect) => effect.id === draggedEffect)
    if (!effect) return

    const updatedEffect = { ...effect }

    if (draggedEdge === "start") {
      // Dragging the start edge
      const newStartTime = Math.max(0, Math.min(mouseTime, effect.startTime + effect.duration - 0.5))
      updatedEffect.duration = effect.startTime + effect.duration - newStartTime
      updatedEffect.startTime = newStartTime
    } else if (draggedEdge === "end") {
      // Dragging the end edge
      const newDuration = Math.max(0.5, mouseTime - effect.startTime)
      updatedEffect.duration = Math.min(newDuration, duration - effect.startTime)
    } else {
      // Dragging the whole effect
      const newStartTime = Math.max(0, Math.min(mouseTime - effect.duration / 2, duration - effect.duration))
      updatedEffect.startTime = newStartTime
    }

    onUpdateEffect(updatedEffect)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedEffect(null)
    setDraggedEdge(null)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mouseup", handleMouseUp)
      return () => document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Update the timeMarkers generation for better interval display
  // Generate time markers with improved intervals
  const timeMarkers = []
  // Determine appropriate interval based on duration
  let markerInterval = 1 // Default 1 second

  if (duration > 120) {
    markerInterval = 10 // 10 seconds for videos longer than 2 minutes
  } else if (duration > 60) {
    markerInterval = 5 // 5 seconds for videos longer than 1 minute
  } else if (duration > 30) {
    markerInterval = 2 // 2 seconds for videos longer than 30 seconds
  }

  // Generate major and minor markers
  for (let i = 0; i <= duration; i++) {
    const isMajor = i % markerInterval === 0
    if (isMajor || duration <= 20) {
      // Show all markers for short videos
      timeMarkers.push(
        <div
          key={i}
          className={`absolute top-0 ${isMajor ? "h-4 border-l border-gray-400" : "h-2 border-l border-gray-600"}`}
          style={{ left: `${(i / duration) * 100}%` }}
        >
          {isMajor && <div className="text-xs text-gray-400 mt-4 -ml-2">{formatTime(i)}</div>}
        </div>,
      )
    }
  }

  return (
    <div className="mt-4">
      <div
        ref={timelineRef}
        className="relative h-24 bg-gray-800 rounded-lg cursor-pointer"
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 right-0 h-8">{timeMarkers}</div>

        {/* Main timeline track */}
        <div className="absolute top-10 left-0 right-0 h-8 bg-green-800/50 rounded">
          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-pink-500 z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="w-3 h-3 rounded-full bg-pink-500 -ml-1 -mt-1.5"></div>
          </div>
        </div>

        {/* Zoom effects */}
        <div className="absolute top-20 left-0 right-0 h-12">
          {zoomEffects.map((effect) => (
            <div
              key={effect.id}
              className={`absolute h-10 rounded flex items-center justify-center text-xs font-medium ${
                selectedEffect?.id === effect.id ? "bg-blue-500/70 border-2 border-blue-400" : "bg-blue-600/50"
              }`}
              style={{
                left: `${(effect.startTime / duration) * 100}%`,
                width: `${(effect.duration / duration) * 100}%`,
              }}
              onMouseDown={(e) => handleEffectMouseDown(e, effect.id)}
            >
              {/* Drag handles */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                onMouseDown={(e) => handleEffectMouseDown(e, effect.id, "start")}
              ></div>
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                onMouseDown={(e) => handleEffectMouseDown(e, effect.id, "end")}
              ></div>

              <span className="text-white">Zoom {effect.duration.toFixed(1)}s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

