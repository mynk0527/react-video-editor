export interface ZoomEffect {
  id: string
  startTime: number
  duration: number
  level: number
  centerX: number
  centerY: number
  zoomStyle?: "in-only" | "out-only" | "in-out" // Default will be "in-out"
}

