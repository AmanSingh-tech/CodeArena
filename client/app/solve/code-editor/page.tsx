"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// Old entry point (/solve/code-editor?problemId=…). The solve view now lives at
// /solve/[problemId]; this keeps existing links working.
function Redirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const problemId = searchParams.get("problemId")

  useEffect(() => {
    router.replace(problemId ? `/solve/${problemId}` : "/practice")
  }, [router, problemId])

  return null
}

export default function SolveCodeEditorPage() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  )
}
