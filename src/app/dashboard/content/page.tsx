"use client"

import { ContentGenerator } from "@/components/content-generator"
import { AirtableStats } from "@/components/airtable-stats"
import { useState } from "react"

export default function ContentPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleContentSaved = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Content Creation</h2>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <ContentGenerator onContentSaved={handleContentSaved} />
        </div>
        
        <div>
          <AirtableStats refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  )
}