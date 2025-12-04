"use client"

import { EmptyState } from "./EmptyState"
import { LoadingState } from "./LoadingState"
import { ResultDisplay } from "./ResultDisplay"

interface CanvasAreaProps {
  loading: boolean
  result: {
    image_url?: string
    job_id: string
    status: string
  } | null
  setPrompt: (prompt: string) => void
  onRefresh?: () => void
}

export function CanvasArea({ loading, result, setPrompt, onRefresh }: CanvasAreaProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 lg:p-8 min-h-[500px]">
      {!result && !loading && <EmptyState setPrompt={setPrompt} />}
      {loading && <LoadingState />}
      {result && <ResultDisplay image={result} onRefresh={onRefresh} />}
    </div>
  )
}
