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
  queueJobId?: string
  databaseJobId?: string
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
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [isSavingVoice, setIsSavingVoice] = useState(false)

  // Load saved voice guidelines
  useEffect(() => {
    const saved = localStorage.getItem('voiceGuidelines')
    if (saved) {
      setVoiceGuidelines(saved)
    }
  }, [])

  const handleSaveVoiceGuidelines = () => {
    setIsSavingVoice(true)
    try {
      localStorage.setItem('voiceGuidelines', voiceGuidelines)
      toast.success("Voice guidelines saved successfully")
    } catch (error) {
      toast.error("Failed to save voice guidelines")
    } finally {
      setIsSavingVoice(false)
    }
  }

  // Setup real-time subscription and polling for job updates
  useEffect(() => {
    if (currentJob?.id) {
      console.log('Setting up subscriptions for job ID:', currentJob.id)
      
      // Temporarily disable real-time subscriptions to avoid RLS issues
      // The polling mechanism below will handle updates instead
      console.log('Real-time subscriptions disabled - using polling fallback')

      // Also setup polling fallback
      const pollJob = async () => {
        try {
          // Use queue job ID for API polling if available, otherwise database job ID
          const jobIdForPolling = currentJob.queueJobId || currentJob.id
          console.log('Polling job status for:', jobIdForPolling)
          
          const response = await fetch(`/api/content/job/${jobIdForPolling}`)
          if (response.ok) {
            const result = await response.json()
            console.log('Polling result:', result)
            
            if (result.success && result.job) {
              setCurrentJob(prev => ({
                ...prev!,
                status: result.job.status,
                progress: result.job.progress,
                error: result.job.error
              }))

              // If job completed, fetch drafts and stop polling
              if (result.job.status === 'completed') {
                setIsGenerating(false)
                
                if (result.drafts?.length > 0) {
                  setJobDrafts(result.drafts)
                  onContentGenerated?.(result.drafts)
                  toast.success(`Generated ${result.drafts.length} content variations!`)
                } else {
                  // Job completed but no drafts found - this is our current issue
                  console.warn('Job completed but no drafts found. Attempting manual fetch...')
                  toast.warning('Job completed but results not found. Trying to fetch results...')
                  
                  // Try to fetch drafts directly using different job IDs
                  await fetchJobResultsWithFallback(currentJob)
                }
                
                // Stop polling since job is complete
                if (interval) {
                  clearInterval(interval)
                  setPollingInterval(null)
                  console.log('Polling stopped - job completed')
                }
              } else if (result.job.status === 'failed') {
                setIsGenerating(false)
                toast.error(result.job.error || 'Content generation failed')
                
                // Stop polling on failure too
                if (interval) {
                  clearInterval(interval)
                  setPollingInterval(null)
                }
              }
            }
          }
        } catch (error) {
          console.error('Error polling job status:', error)
        }
      }

      // Poll every 5 seconds
      const interval = setInterval(pollJob, 5000)
      setPollingInterval(interval)

      return () => {
        // Clean up polling interval
        if (interval) clearInterval(interval)
      }
    }
  }, [currentJob?.id])

  const fetchJobResults = async (jobId: string) => {
    try {
      // Use API endpoint instead of direct Supabase call to avoid RLS issues
      const response = await fetch(`/api/content/job/${jobId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.drafts?.length > 0) {
          setJobDrafts(result.drafts)
          onContentGenerated?.(result.drafts)
          toast.success(`Generated ${result.drafts.length} content variations!`)
        }
      }
    } catch (error) {
      console.error('Error fetching job results:', error)
    }
  }

  const fetchJobResultsWithFallback = async (job: JobStatus) => {
    console.log('Attempting fallback fetch with job:', job)
    
    try {
      // Try API calls with different job IDs (avoid direct Supabase calls to prevent RLS issues)
      const jobIdsToTry = [
        job.databaseJobId,
        job.queueJobId, 
        job.id
      ].filter(Boolean) // Remove undefined values

      for (const jobId of jobIdsToTry) {
        console.log('Trying job ID via API:', jobId)
        try {
          const response = await fetch(`/api/content/job/${jobId}`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.drafts?.length > 0) {
              console.log('Found drafts via API:', result.drafts.length, 'for job ID:', jobId)
              setJobDrafts(result.drafts)
              onContentGenerated?.(result.drafts)
              toast.success(`Found ${result.drafts.length} content variations!`)
              return
            }
          } else {
            console.log('API call failed for job ID:', jobId, 'Status:', response.status)
          }
        } catch (apiError) {
          console.log('API error for job ID:', jobId, apiError)
        }
      }

      // If all attempts fail
      console.error('No drafts found with any job ID')
      toast.error('Job completed but could not retrieve results. Please check the debug endpoint.')
      
    } catch (error) {
      console.error('Error in fallback fetch:', error)
      toast.error('Error retrieving job results')
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
    
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

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
      console.log('Job creation result:', result)
      
      if (result.success && result.jobId) {
        // Set initial job status - use database job ID for subscriptions if available
        const jobIdForSubscription = result.databaseJobId || result.jobId
        console.log('Using job ID for subscription:', jobIdForSubscription, 'Database ID:', result.databaseJobId, 'Queue ID:', result.queueJobId)
        
        setCurrentJob({
          id: jobIdForSubscription, // Use database job ID for subscriptions
          queueJobId: result.queueJobId,
          databaseJobId: result.databaseJobId,
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
    <div className="flex flex-col lg:flex-row lg:gap-8">
      {/* Left Column - Input Section */}
      <div className="lg:w-1/2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Content Generator
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
                className="min-h-[175px]"
                placeholder="Enter your topic, idea, or key message for the LinkedIn post..."
                disabled={isGenerating}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="voiceGuidelines">Voice Guidelines</Label>
                <Button 
                  onClick={handleSaveVoiceGuidelines} 
                  variant="outline" 
                  size="sm"
                  disabled={isSavingVoice || isGenerating}
                >
                  {isSavingVoice ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <Textarea
                id="voiceGuidelines"
                value={voiceGuidelines}
                onChange={(e) => setVoiceGuidelines(e.target.value)}
                className="min-h-[300px]"
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
      </div>

      {/* Right Column - Results Section */}
      <div className="lg:w-1/2 mt-6 lg:mt-0">
        {/* Job Status */}
        {currentJob ? (
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
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              Generated content and progress will appear here.
            </p>
          </div>
        )}

        {/* Generated Content */}
        {jobDrafts.length > 0 && (
          <div className="space-y-4 mt-6">
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
    </div>
  )
}