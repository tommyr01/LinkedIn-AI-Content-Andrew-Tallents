"use client"

import { ContentGenerator } from "@/components/content-generator"
import { LoadingCard } from "@/components/loading-card"
import { useState } from "react"

// New component to display webhook responses
function WebhookResponses({ loading, responses }: { loading: boolean; responses: string[] }) {
  return (
    <div className="space-y-4">
      {loading && <LoadingCard />}
      {!loading && responses.map((response: string, index: number) => (
        <div key={index} className="p-4 border rounded-md">
          <h3 className="text-xl font-semibold">Response {index + 1}</h3>
          <pre className="whitespace-pre-wrap font-sans text-sm">{response}</pre>
        </div>
      ))}
    </div>
  )
}

export default function ContentPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [webhookResponses, setWebhookResponses] = useState<string[]>([])

  const handleContentSaved = () => {}

  // No polling here—responses come via callback from ContentGenerator

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Content Creation</h2>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <ContentGenerator
            onContentSaved={handleContentSaved}
            onWebhookResponses={setWebhookResponses}
            onLoadingChange={setIsLoading}
          />
        </div>

        <div>
          <WebhookResponses loading={isLoading} responses={webhookResponses} />
        </div>
      </div>
    </div>
  )
}