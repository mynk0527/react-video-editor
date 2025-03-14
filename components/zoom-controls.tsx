"use client"

import { useState, useEffect } from "react"
import type { ZoomEffect } from "@/lib/types"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface ZoomControlsProps {
  effect: ZoomEffect
  onUpdate: (effect: ZoomEffect) => void
  onDelete: (effectId: string) => void
}

export default function ZoomControls({ effect, onUpdate, onDelete }: ZoomControlsProps) {
  const [zoomCenter, setZoomCenter] = useState({ x: effect.centerX, y: effect.centerY })
  const [zoomStyle, setZoomStyle] = useState(effect.zoomStyle || "in-out") 

  // Ensure we track any external changes to the effect
  useEffect(() => {
    setZoomCenter({ x: effect.centerX, y: effect.centerY })
    setZoomStyle(effect.zoomStyle || "in-out")
  }, [effect])

  const handleZoomLevelChange = (value: number[]) => {
    onUpdate({
      ...effect,
      level: value[0],
    })
  }

  const handleZoomCenterChange = (x: number, y: number) => {
    setZoomCenter({ x, y })
    onUpdate({
      ...effect,
      centerX: x,
      centerY: y,
    })
  }

  const handleDurationChange = (value: number[]) => {
    onUpdate({
      ...effect,
      duration: value[0],
    })
  }
  
  const handleZoomStyleChange = (value: string) => {
    setZoomStyle(value as "in-out" | "in-only" | "out-only")
    onUpdate({
      ...effect,
      zoomStyle: value as "in-out" | "in-only" | "out-only",
    })
  }

  const handleDelete = () => {
    onDelete(effect.id)
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Zoom Controls</h3>
        <Button variant="destructive" size="icon" onClick={handleDelete} className="h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Zoom Level</label>
          <div className="flex items-center gap-4">
            <Slider
              value={[effect.level]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={handleZoomLevelChange}
              className="flex-1"
            />
            <span className="text-sm font-mono w-10">{effect.level.toFixed(1)}x</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
          <div className="flex items-center gap-4">
            <Slider
              value={[effect.duration]}
              min={0.5}
              max={10}
              step={0.1}
              onValueChange={handleDurationChange}
              className="flex-1"
            />
            <span className="text-sm font-mono w-10">{effect.duration.toFixed(1)}s</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Zoom Center</label>
          <div
            className="relative bg-gray-900 border border-gray-700 rounded-lg aspect-video cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = (e.clientX - rect.left) / rect.width
              const y = (e.clientY - rect.top) / rect.height
              handleZoomCenterChange(x, y)
            }}
          >
            <div
              className="absolute w-4 h-4 rounded-full bg-pink-500 transform -translate-x-1/2 -translate-y-1/2 border-2 border-white"
              style={{
                left: `${zoomCenter.x * 100}%`,
                top: `${zoomCenter.y * 100}%`,
              }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400 text-center">Click to set zoom center point</div>
        </div>

        <div className="pt-4 border-t border-gray-700 mt-4">
          <label className="block text-sm font-medium mb-2">Zoom Style</label>
          <RadioGroup
            value={zoomStyle}
            className="flex space-x-4"
            onValueChange={handleZoomStyleChange}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in-out" id="in-out" />
              <Label htmlFor="in-out">Zoom In & Out</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in-only" id="in-only" />
              <Label htmlFor="in-only">Zoom In Only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="out-only" id="out-only" />
              <Label htmlFor="out-only">Zoom Out Only</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium mb-2">Advanced Settings</h4>
          <div className="text-xs text-gray-400">Start time: {effect.startTime.toFixed(2)}s</div>
        </div>
      </div>
    </div>
  )
}