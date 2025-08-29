"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  Sparkles, 
  Copy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Target,
  MessageCircle,
  TrendingUp,
  Brain,
  BarChart3,
  Trophy,
  Zap,
  Eye,
  Users,
  RotateCcw
} from "lucide-react"
import { SupabaseService, ContentJob, ContentDraft } from "../lib/supabase"

interface PerformanceContentGeneratorProps {
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

interface StrategicVariant {
  type: 'performance' | 'engagement' | 'experimental'
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  focus: string
  expectedOutcome: string
}

const STRATEGIC_VARIANTS: StrategicVariant[] = [
  {
    type: 'performance',
    name: 'Executive Intelligence',
    description: 'Uses Andrew\'s proven strategic patterns and highest-performing executive content structures',
    icon: Trophy,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    focus: 'Proven Strategic Patterns',
    expectedOutcome: 'High executive reach & strategic engagement'
  },
  {
    type: 'engagement',
    name: 'Strategic Dialogue',
    description: 'Maximizes strategic conversations and meaningful C-level interactions',
    icon: MessageCircle,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    focus: 'Executive Conversation Starters',
    expectedOutcome: 'Strategic discussions & C-level engagement'
  },
  {
    type: 'experimental',
    name: 'Innovation Intelligence',
    description: 'Tests new strategic formats and discovers emerging executive content patterns',
    icon: Brain,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    focus: 'Strategic Innovation & Discovery',
    expectedOutcome: 'New strategic insights & pattern discovery'
  }
]

const CONTENT_INTENTS = [
  { value: 'thought-leadership', label: 'Executive Thought Leadership', description: 'Share strategic insights and C-level expertise' },
  { value: 'company-update', label: 'Strategic Update', description: 'Announce strategic initiatives or executive achievements' },
  { value: 'personal-story', label: 'Executive Journey', description: 'Share leadership experiences and strategic lessons learned' },
  { value: 'industry-commentary', label: 'Strategic Intelligence', description: 'Provide executive perspective on industry trends' },
  { value: 'educational', label: 'Leadership Intelligence', description: 'Share strategic frameworks and executive concepts' }
]

export function PerformanceContentGenerator({ onContentGenerated }: PerformanceContentGeneratorProps) {
  const [topic, setTopic] = useState("")
  const [selectedIntent, setSelectedIntent] = useState("thought-leadership")
  const [selectedVariants, setSelectedVariants] = useState<string[]>(['performance'])
  const [platform] = useState("linkedin")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null)
  const [jobDrafts, setJobDrafts] = useState<ContentDraft[]>([])
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [activeTab, setActiveTab] = useState('generator')
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false)
  const [editedContent, setEditedContent] = useState<{[key: string]: string}>({})
  


  const toggleVariant = (variantType: string) => {
    setSelectedVariants(prev => {
      if (prev.includes(variantType)) {
        // Don't allow removing the last variant
        if (prev.length === 1) {
          toast.error("At least one variant must be selected")
          return prev
        }
        return prev.filter(v => v !== variantType)
      } else {
        return [...prev, variantType]
      }
    })
  }

  // Setup polling for job updates
  useEffect(() => {
    if (currentJob?.id) {
      const pollJob = async () => {
        try {
          const jobIdForPolling = currentJob.queueJobId || currentJob.id
          const response = await fetch(`/api/content/job/${jobIdForPolling}`)
          
          if (response.ok) {
            const result = await response.json()
            
            if (result.success && result.job) {
              setCurrentJob(prev => ({
                ...prev!,
                status: result.job.status,
                progress: result.job.progress,
                error: result.job.error
              }))

              if (result.job.status === 'completed') {
                setIsGenerating(false)
                
                if (result.drafts?.length > 0 && !hasNotifiedCompletion) {
                  setJobDrafts(result.drafts)
                  onContentGenerated?.(result.drafts)
                  toast.success(`Generated ${result.drafts.length} executive strategic intelligence variations!`)
                  setActiveTab('results')
                  setHasNotifiedCompletion(true)
                }
                
                if (pollingInterval) {
                  clearInterval(pollingInterval)
                  setPollingInterval(null)
                }
              } else if (result.job.status === 'failed') {
                setIsGenerating(false)
                toast.error(result.job.error || 'Strategic intelligence generation failed')
                
                if (pollingInterval) {
                  clearInterval(pollingInterval)
                  setPollingInterval(null)
                }
              }
            }
          }
        } catch (error) {
          console.error('Error polling job status:', error)
        }
      }

      const interval = setInterval(pollJob, 3000)
      setPollingInterval(interval)

      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [currentJob?.id])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    if (selectedVariants.length === 0) {
      toast.error("Please select at least one strategic intelligence variant")
      return
    }

    setIsGenerating(true)
    setCurrentJob(null)
    setJobDrafts([])
    setHasNotifiedCompletion(false)
    
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
          contentIntent: selectedIntent,
          strategicVariants: selectedVariants,
          tone: 'professional',
          useVoiceLearning: true // RAG Voice learning enabled for authentic Andrew voice
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create content generation job')
      }

      const result = await response.json()
      
      if (result.success && result.jobId) {
        const jobIdForSubscription = result.databaseJobId || result.jobId
        
        setCurrentJob({
          id: jobIdForSubscription,
          queueJobId: result.queueJobId,
          databaseJobId: result.databaseJobId,
          status: 'pending',
          progress: 0,
          topic,
          platform,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        toast.success('Performance-driven content generation started!')
        setActiveTab('progress')
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

  const getEditableContent = (draftId: string, originalContent: string) => {
    return editedContent[draftId] || originalContent
  }

  const updateEditedContent = (draftId: string, newContent: string) => {
    setEditedContent(prev => ({
      ...prev,
      [draftId]: newContent
    }))
  }

  const resetEditedContent = (draftId: string) => {
    setEditedContent(prev => {
      const updated = { ...prev }
      delete updated[draftId]
      return updated
    })
  }

  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }


  const getVariantStats = (draft: ContentDraft) => {
    const stats = []
    
    if (draft.content.estimated_voice_score) {
      stats.push({
        label: 'Voice Match',
        value: `${draft.content.estimated_voice_score}%`,
        color: draft.content.estimated_voice_score >= 85 ? 'text-green-600' : 
               draft.content.estimated_voice_score >= 70 ? 'text-yellow-600' : 'text-red-600'
      })
    }
    
    if (draft.metadata.predicted_engagement) {
      stats.push({
        label: 'Predicted Engagement',
        value: `${draft.metadata.predicted_engagement}`,
        color: 'text-blue-600'
      })
    }
    
    if (draft.metadata.prediction_confidence) {
      stats.push({
        label: 'Confidence',
        value: `${draft.metadata.prediction_confidence}%`,
        color: 'text-purple-600'
      })
    }
    
    return stats
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
            AMPLIFY Strategic Intelligence Generator
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Executive-focused strategic intelligence creation with performance analytics and Andrew's authentic voice patterns
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 h-14 p-1 bg-gray-800 shadow-lg border-0">
              <TabsTrigger value="generator" className="flex items-center gap-2 text-sm font-medium text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white hover:bg-gray-700 rounded-lg transition-all duration-200">
                <Sparkles className="h-4 w-4" />
                Generator
              </TabsTrigger>
              <TabsTrigger value="progress" disabled={!currentJob} className="flex items-center gap-2 text-sm font-medium text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white hover:bg-gray-700 disabled:text-gray-500 rounded-lg transition-all duration-200">
                <RefreshCw className="h-4 w-4" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="results" disabled={jobDrafts.length === 0} className="flex items-center gap-2 text-sm font-medium text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white hover:bg-gray-700 disabled:text-gray-500 rounded-lg transition-all duration-200">
                <BarChart3 className="h-4 w-4" />
                Results
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 text-sm font-medium text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white hover:bg-gray-700 rounded-lg transition-all duration-200">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="generator" className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Content Input */}
            <div className="space-y-8">
              <Card className="shadow-xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl text-white">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    Strategic Intelligence Framework
                  </CardTitle>
                  <CardDescription className="text-base text-gray-300">
                    Define your executive intelligence goals and strategic approach
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="intent" className="text-sm font-semibold text-white">Strategic Intent</Label>
                    <Select value={selectedIntent} onValueChange={setSelectedIntent}>
                      <SelectTrigger className="h-12 border-gray-600 bg-gray-700 hover:bg-gray-600 transition-colors text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {CONTENT_INTENTS.map((intent) => (
                          <SelectItem key={intent.value} value={intent.value} className="p-4 text-white hover:bg-gray-700">
                            <div>
                              <div className="font-medium text-white">{intent.label}</div>
                              <div className="text-sm text-gray-300 mt-1">{intent.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="topic" className="text-sm font-semibold text-white">Executive Topic or Strategic Message</Label>
                    <Textarea
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="min-h-[140px] border-gray-600 bg-gray-700 hover:bg-gray-600 transition-colors text-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
                      placeholder="Enter your executive topic, strategic insight, or key leadership message for your LinkedIn intelligence..."
                      disabled={isGenerating}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl text-white">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    Intelligence Generation Preview
                  </CardTitle>
                  <CardDescription className="text-base text-gray-300">
                    Preview your strategic intelligence generation settings and parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                      <span className="font-semibold text-white">Selected Variants:</span>
                      <Badge className="bg-amber-500 text-white hover:bg-amber-600 px-3 py-1">
                        {selectedVariants.length} variants
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                      <span className="font-semibold text-white">Strategic Intent:</span>
                      <span className="text-gray-300 font-medium">
                        {CONTENT_INTENTS.find(i => i.value === selectedIntent)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                      <span className="font-semibold text-white">Platform:</span>
                      <span className="text-gray-300 font-medium">LinkedIn</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim() || selectedVariants.length === 0}
                    className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-base shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                        Generating Strategic Intelligence...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-3" />
                        Generate {selectedVariants.length} Strategic Intelligence Variants
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Strategic Variants Selection */}
            <div className="space-y-8">
              <Card className="shadow-xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl text-white">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    Strategic Intelligence Variants
                  </CardTitle>
                  <CardDescription className="text-base text-gray-300">
                    Choose which strategic intelligence approaches to generate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {STRATEGIC_VARIANTS.map((variant) => {
                    const Icon = variant.icon
                    const isSelected = selectedVariants.includes(variant.type)
                    
                    return (
                      <Card 
                        key={variant.type} 
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                          isSelected 
                            ? `border-2 border-amber-500 shadow-lg bg-gradient-to-br from-amber-500/30 to-orange-500/30` 
                            : 'border border-gray-600 hover:border-gray-500 bg-gray-800 hover:bg-gray-700'
                        }`}
                        onClick={() => toggleVariant(variant.type)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl transition-all duration-300 ${
                              isSelected ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gray-700'
                            }`}>
                              <Icon className={`h-6 w-6 ${
                                isSelected ? 'text-white' : 'text-gray-300'
                              }`} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-lg text-white">{variant.name}</h3>
                                {isSelected && (
                                  <div className="p-1 bg-green-500 rounded-full">
                                    <CheckCircle className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-gray-300 mb-4 leading-relaxed">
                                {variant.description}
                              </p>
                              
                              <div className="grid grid-cols-1 gap-3">
                                <div className={`p-3 rounded-lg ${
                                  isSelected ? 'bg-black/20' : 'bg-gray-700'
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm text-gray-200">Focus:</span>
                                    <span className={`text-sm font-medium ${
                                      isSelected ? 'text-amber-200' : 'text-blue-400'
                                    }`}>
                                      {variant.focus}
                                    </span>
                                  </div>
                                </div>
                                <div className={`p-3 rounded-lg ${
                                  isSelected ? 'bg-black/20' : 'bg-gray-700'
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm text-gray-200">Expected:</span>
                                    <span className="text-sm text-gray-300">
                                      {variant.expectedOutcome}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </CardContent>
              </Card>

            </div>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-8">
          {currentJob ? (
            <Card className="shadow-xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
              <CardHeader className="pb-8">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-2xl text-white">
                    {getStatusIcon(currentJob.status)}
                    Performance Content Generation
                  </span>
                  <Badge 
                    className={`px-4 py-2 text-sm font-semibold ${
                      currentJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                      currentJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                      currentJob.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {currentJob.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Overall Progress</span>
                    <span className="text-2xl font-bold text-amber-400">{currentJob.progress}%</span>
                  </div>
                  <Progress value={currentJob.progress} className="w-full h-3 bg-gray-700" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <span className="font-bold text-blue-800 block mb-2">Topic:</span>
                    <p className="text-blue-700 leading-relaxed">{currentJob.topic}</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <span className="font-bold text-green-800 block mb-2">Intent:</span>
                    <p className="text-green-700">
                      {CONTENT_INTENTS.find(i => i.value === selectedIntent)?.label}
                    </p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                    <span className="font-bold text-purple-800 block mb-2">Variants:</span>
                    <p className="text-purple-700 text-xl font-bold">{selectedVariants.length} strategies</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                    <span className="font-bold text-orange-800 block mb-2">Platform:</span>
                    <p className="text-orange-700 font-semibold">LinkedIn</p>
                  </div>
                </div>

                {currentJob.error && (
                  <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-6 w-6 text-red-600" />
                      <p className="text-red-800 font-semibold text-lg">{currentJob.error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-20">
              <div className="p-4 bg-gray-700 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Active Generation</h3>
              <p className="text-gray-400 text-lg">Start generating content to see progress here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-8">
          {jobDrafts.length > 0 ? (
            <>
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                  Strategic Content Variants
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  {jobDrafts.length} performance-optimised variations generated
                </p>
                <div className="flex justify-center gap-4">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 text-sm font-semibold">
                    {jobDrafts.filter(d => d.content.estimated_voice_score >= 85).length} High Voice Match
                  </Badge>
                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 text-sm font-semibold">
                    {jobDrafts.filter(d => d.metadata.historical_context_used).length} Using Historical Data
                  </Badge>
                </div>
              </div>

              <div className="grid gap-8">
                {jobDrafts.map((draft, index) => {
                  const variant = STRATEGIC_VARIANTS.find(v => 
                    draft.agent_name.toLowerCase().includes(v.type)
                  )
                  const Icon = variant?.icon || Trophy
                  const stats = getVariantStats(draft)
                  
                  return (
                    <Card key={draft.id} className="overflow-hidden shadow-xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
                      <CardHeader className={`border-l-4 pb-6 ${
                        variant?.type === 'performance' ? 'border-amber-500 bg-gradient-to-r from-amber-900/20 to-orange-900/20' :
                        variant?.type === 'engagement' ? 'border-blue-500 bg-gradient-to-r from-blue-900/20 to-cyan-900/20' :
                        variant?.type === 'experimental' ? 'border-purple-500 bg-gradient-to-r from-purple-900/20 to-violet-900/20' :
                        'border-gray-300 bg-gray-800/50'
                      }`}>
                        <CardTitle className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${
                              variant?.type === 'performance' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                              variant?.type === 'engagement' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              variant?.type === 'experimental' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                              'bg-gray-500'
                            }`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-white mb-2">
                                {variant?.name || draft.agent_name.replace('_', ' ')}
                              </h4>
                              <p className="text-gray-300 font-medium">
                                Variant {draft.variant_number} • {draft.content.approach}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-3">
                            <div className="flex flex-wrap gap-2 justify-end">
                              {stats.map((stat, statIndex) => (
                                <Badge key={statIndex} className={`${
                                  stat.color.includes('green') ? 'bg-green-100 text-green-800' :
                                  stat.color.includes('blue') ? 'bg-blue-100 text-blue-800' :
                                  stat.color.includes('purple') ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                } px-3 py-1 font-semibold`}>
                                  {stat.label}: {stat.value}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              {editedContent[draft.id] && (
                                <Button
                                  variant="outline"
                                  className="border-orange-600 text-orange-400 hover:bg-orange-700 hover:text-white"
                                  onClick={() => resetEditedContent(draft.id)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Reset
                                </Button>
                              )}
                              <Button
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 py-2 shadow-lg transition-all duration-300 hover:shadow-xl"
                                onClick={() => handleCopyContent(getEditableContent(draft.id, draft.content.body))}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Content
                              </Button>
                            </div>
                          </div>
                        </CardTitle>
                        
                        {variant && (
                          <CardDescription>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span><strong className="text-gray-300">Focus:</strong> {variant.focus}</span>
                              <span><strong className="text-gray-300">Expected:</strong> {variant.expectedOutcome}</span>
                              <span><strong className="text-gray-300">Generation time:</strong> {draft.metadata.generation_time_ms}ms</span>
                            </div>
                          </CardDescription>
                        )}
                      </CardHeader>
                      
                      <CardContent className="space-y-6 pt-6">
                        <div className="prose prose-base max-w-none">
                          <Textarea
                            value={getEditableContent(draft.id, draft.content.body)}
                            onChange={(e) => {
                              updateEditedContent(draft.id, e.target.value)
                              autoResizeTextarea(e.target as HTMLTextAreaElement)
                            }}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            className="bg-gray-900 border-gray-600 text-white leading-relaxed text-base shadow-sm focus:border-amber-500 focus:ring-amber-500/20 resize-none overflow-hidden"
                            placeholder="Edit your content here..."
                            style={{ height: 'auto', minHeight: '120px' }}
                            ref={(el) => {
                              if (el) {
                                setTimeout(() => autoResizeTextarea(el), 0)
                              }
                            }}
                          />
                        </div>
                        
                        
                        {draft.content.hashtags && draft.content.hashtags.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="font-semibold text-white">Recommended Hashtags:</h5>
                            <div className="flex flex-wrap gap-3">
                              {draft.content.hashtags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 text-sm font-medium transition-colors">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="p-4 bg-gray-700 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Content Generated</h3>
              <p className="text-gray-400 text-lg">Use the generator to create strategic variants and see results here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8">
          <Card className="shadow-xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
            <CardHeader className="pb-8">
              <CardTitle className="flex items-center gap-3 text-2xl text-white">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                Performance Analytics Dashboard
              </CardTitle>
              <CardDescription className="text-lg text-gray-300">
                Track content performance and optimise Andrew's voice evolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-20">
                <div className="p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                  <BarChart3 className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Analytics Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-2">Performance analytics will appear here after content is posted and tracked.</p>
                <p className="text-gray-400">Real-time engagement tracking and voice evolution insights in development.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="p-3 bg-green-500 rounded-xl w-fit mx-auto mb-4">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-green-800 mb-2">Engagement Tracking</h4>
                    <p className="text-sm text-green-700">Monitor likes, comments, and shares in real-time</p>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <div className="p-3 bg-blue-500 rounded-xl w-fit mx-auto mb-4">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-blue-800 mb-2">Voice Evolution</h4>
                    <p className="text-sm text-blue-700">Track how Andrew's voice adapts and improves</p>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                    <div className="p-3 bg-purple-500 rounded-xl w-fit mx-auto mb-4">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-purple-800 mb-2">Performance Insights</h4>
                    <p className="text-sm text-purple-700">Discover what makes content successful</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}