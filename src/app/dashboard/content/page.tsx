"use client"

import { ContentGenerator } from "@/components/content-generator"
import { AsyncContentGenerator } from "@/components/async-content-generator"
import { LoadingCard } from "@/components/loading-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { Zap, Clock } from "lucide-react"

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
  const [generationType, setGenerationType] = useState<'sync' | 'async'>('sync')

  const handleContentSaved = () => {}

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Content Creation</h2>
          <p className="text-muted-foreground">
            Generate AI-powered LinkedIn content with Andrew's authentic voice
          </p>
        </div>
        
        {/* Generation Type Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={generationType === 'sync' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGenerationType('sync')}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Sync
            <Badge variant="secondary" className="ml-1">Current</Badge>
          </Button>
          <Button
            variant={generationType === 'async' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGenerationType('async')}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Async
            <Badge variant="secondary" className="ml-1">New</Badge>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          {generationType === 'sync' ? (
            <ContentGenerator
              onContentSaved={handleContentSaved}
              onWebhookResponses={setWebhookResponses}
              onLoadingChange={setIsLoading}
            />
          ) : (
            <AsyncContentGenerator
              onContentGenerated={(drafts) => {
                console.log('Generated drafts:', drafts)
              }}
            />
          )}
        </div>

        <div>
          {generationType === 'sync' ? (
            <WebhookResponses loading={isLoading} responses={webhookResponses} />
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Real-time Progress</h3>
              <p className="text-muted-foreground">
                Content generation progress and results will appear here in real-time using Supabase subscriptions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}