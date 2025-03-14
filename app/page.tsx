import VideoEditor from "@/components/video-editor"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-4">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Video Editor with Smooth Zoom Effects</h1>
        <VideoEditor />
      </div>
    </main>
  )
}

