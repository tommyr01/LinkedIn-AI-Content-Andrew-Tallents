"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Sparkles, Copy, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { SupabaseService, ContentJob, ContentDraft } from "../lib/supabase"

interface AsyncContentGeneratorProps {
  onContentGenerated?: (drafts: ContentDraft[]) => void
}

interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  topic: string
  platform: string
  error?: string
  created_at: string
  updated_at: string
}

export function AsyncContentGenerator({ onContentGenerated }: AsyncContentGeneratorProps) {
  const [topic, setTopic] = useState("")
  const [voiceGuidelines, setVoiceGuidelines] = useState("")
  const [platform, setPlatform] = useState("linkedin")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null)
  const [jobDrafts, setJobDrafts] = useState<ContentDraft[]>([])
  const [subscription, setSubscription] = useState<any>(null)

  // Load saved voice guidelines
  useEffect(() => {
    const saved = localStorage.getItem('voiceGuidelines')
    if (saved) {
      setVoiceGuidelines(saved)
    }
  }, [])

  // Setup real-time subscription for job updates
  useEffect(() => {
    if (currentJob?.id) {
      const jobSubscription = SupabaseService.subscribeToJobUpdates(
        currentJob.id,
        (updatedJob: ContentJob) => {
          setCurrentJob({
            id: updatedJob.id,
            status: updatedJob.status,
            progress: updatedJob.progress,
            topic: updatedJob.topic,
            platform: updatedJob.platform,
            error: updatedJob.error,
            created_at: updatedJob.created_at,
            updated_at: updatedJob.updated_at
          })

          // If job completed, fetch drafts
          if (updatedJob.status === 'completed') {
            fetchJobResults(updatedJob.id)
            setIsGenerating(false)
          } else if (updatedJob.status === 'failed') {
            setIsGenerating(false)
            toast.error(updatedJob.error || 'Content generation failed')
          }
        }
      )

      const draftsSubscription = SupabaseService.subscribeToJobDrafts(
        currentJob.id,
        (draft: ContentDraft) => {
          setJobDrafts(prev => [...prev, draft])
        }
      )

      setSubscription({ job: jobSubscription, drafts: draftsSubscription })

      return () => {
        jobSubscription.unsubscribe()
        draftsSubscription.unsubscribe()
      }
    }
  }, [currentJob?.id])

  const fetchJobResults = async (jobId: string) => {
    try {
      const { job, drafts } = await SupabaseService.getJobWithDrafts(jobId)
      if (drafts.length > 0) {
        setJobDrafts(drafts)
        onContentGenerated?.(drafts)
        toast.success(`Generated ${drafts.length} content variations!`)
      }
    } catch (error) {
      console.error('Error fetching job results:', error)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGenerating(true)
    setCurrentJob(null)
    setJobDrafts([])

    try {
      const response = await fetch('/api/content/generate-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic,
          platform,
          voiceGuidelines: voiceGuidelines.trim() || undefined,
          postType: 'Thought Leadership',
          tone: 'professional'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create content generation job')
      }

      const result = await response.json()
      
      if (result.success && result.jobId) {
        // Set initial job status
        setCurrentJob({
          id: result.jobId,
          status: 'pending',
          progress: 0,
          topic,
          platform,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        toast.success('Content generation started! You can see real-time progress below.')
        
        // Save voice guidelines
        if (voiceGuidelines.trim()) {
          localStorage.setItem('voiceGuidelines', voiceGuidelines)
        }
      } else {
        throw new Error('Invalid response from server')
      }

    } catch (error) {
      console.error('Error starting content generation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start content generation')
      setIsGenerating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'processing': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success("Content copied to clipboard!")
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Content Generator (Async)
          </CardTitle>
          <CardDescription>
            Generate LinkedIn content with real-time progress updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic or Idea</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[100px]"
              placeholder="Enter your topic, idea, or key message for the LinkedIn post..."
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="voiceGuidelines">Voice Guidelines</Label>
            <Textarea
              id="voiceGuidelines"
              value={voiceGuidelines}
              onChange={(e) => setVoiceGuidelines(e.target.value)}
              className="min-h-[80px]"
              placeholder="Enter tone of voice guidelines..."
              disabled={isGenerating}
            />
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Job Status */}
      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon(currentJob.status)}
                Job Status
              </span>
              <Badge variant="outline" className={getStatusColor(currentJob.status)}>
                {currentJob.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{currentJob.progress}%</span>
              </div>
              <Progress value={currentJob.progress} className="w-full" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Topic:</span>
                <p className="text-muted-foreground">{currentJob.topic}</p>
              </div>
              <div>
                <span className="font-medium">Platform:</span>
                <p className="text-muted-foreground">{currentJob.platform}</p>
              </div>
            </div>

            {currentJob.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{currentJob.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated Content */}
      {jobDrafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Content ({jobDrafts.length} variations)</h3>
          {jobDrafts.map((draft, index) => (
            <Card key={draft.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Variation {draft.variant_number}: {draft.agent_name.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Score: {draft.content.estimated_voice_score}%
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyContent(draft.content.body)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {draft.content.approach} • {draft.metadata.token_count} tokens • {draft.metadata.generation_time_ms}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm mb-4">
                  {draft.content.body}
                </div>
                {draft.content.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.content.hashtags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}