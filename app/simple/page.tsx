"use client"

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { ProtectedRoute } from '@/components/protected-route'

const SimpleNoteEditor = dynamic(
  () => import("@/components/tiptap-templates/simple/simple-editor").then(mod => ({ default: mod.SimpleEditor })),
  { 
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center">Loading editor...</div>
  }
)

export default function Page() {
  return (
    <ProtectedRoute>
      <div className="h-screen">
        <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
          <SimpleNoteEditor />
        </Suspense>
      </div>
    </ProtectedRoute>
  )
}
