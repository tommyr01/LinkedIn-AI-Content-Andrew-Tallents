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
      
      <div>
        <AsyncContentGenerator
          onContentGenerated={(drafts) => {
            console.log('Generated drafts:', drafts)
          }}
        />
      </div>
    </div>
  )
}