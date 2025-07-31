"use client"

import { AsyncContentGenerator } from "@/components/async-content-generator"

export default function ContentPage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Content Creation</h2>
          <p className="text-muted-foreground">
            Generate AI-powered LinkedIn content with Andrew's authentic voice using enhanced research
          </p>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <AsyncContentGenerator
            onContentGenerated={(drafts) => {
              console.log('Generated drafts:', drafts)
            }}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Real-time Progress</h3>
          <p className="text-muted-foreground">
            Content generation progress and results will appear here in real-time. The enhanced research system provides UK-specific insights for self-leadership content.
          </p>
        </div>
      </div>
    </div>
  )
}