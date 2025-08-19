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
  Calendar,
  Users
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
    name: 'Performance-Optimized',
    description: 'Uses Andrew\'s proven successful patterns and highest-performing content structures',
    icon: Trophy,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    focus: 'Proven Patterns',
    expectedOutcome: 'High reach & professional engagement'
  },
  {
    type: 'engagement',
    name: 'Engagement-Focused',
    description: 'Maximizes comments, conversations, and meaningful interactions',
    icon: MessageCircle,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    focus: 'Conversation Starters',
    expectedOutcome: 'More comments & discussions'
  },
  {
    type: 'experimental',
    name: 'Experimental Approach',
    description: 'Tests new content formats and discovers emerging patterns',
    icon: Brain,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    focus: 'Innovation & Discovery',
    expectedOutcome: 'New insights & pattern discovery'
  }
]

const CONTENT_INTENTS = [
  { value: 'thought-leadership', label: 'Thought Leadership', description: 'Share insights and industry expertise' },
  { value: 'company-update', label: 'Company Update', description: 'Announce news or achievements' },
  { value: 'personal-story', label: 'Personal Story', description: 'Share experiences and lessons learned' },
  { value: 'industry-commentary', label: 'Industry Commentary', description: 'React to trends and news' },
  { value: 'educational', label: 'Educational', description: 'Teach or explain concepts' }
]

export function PerformanceContentGenerator({ onContentGenerated }: PerformanceContentGeneratorProps) {
  const [topic, setTopic] = useState("")
  const [voiceGuidelines, setVoiceGuidelines] = useState("")
  const [selectedIntent, setSelectedIntent] = useState("thought-leadership")
  const [selectedVariants, setSelectedVariants] = useState<string[]>(['performance'])
  const [platform] = useState("linkedin")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null)
  const [jobDrafts, setJobDrafts] = useState<ContentDraft[]>([])
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [isSavingVoice, setIsSavingVoice] = useState(false)
  const [activeTab, setActiveTab] = useState('generator')

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
                
                if (result.drafts?.length > 0) {
                  setJobDrafts(result.drafts)
                  onContentGenerated?.(result.drafts)
                  toast.success(`Generated ${result.drafts.length} strategic content variations!`)
                  setActiveTab('results')
                }
                
                if (pollingInterval) {
                  clearInterval(pollingInterval)
                  setPollingInterval(null)
                }
              } else if (result.job.status === 'failed') {
                setIsGenerating(false)
                toast.error(result.job.error || 'Content generation failed')
                
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
      toast.error("Please select at least one strategic variant")
      return
    }

    setIsGenerating(true)
    setCurrentJob(null)
    setJobDrafts([])
    
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    try {
      const response = await fetch('/api/content/generate-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic,
          platform,
          voiceGuidelines: voiceGuidelines.trim() || undefined,
          contentIntent: selectedIntent,
          strategicVariants: selectedVariants,
          tone: 'professional'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
            Strategic Content Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            AI-powered content creation with performance intelligence and Andrew's authentic voice
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 h-14 p-1 bg-white shadow-lg border-0">
              <TabsTrigger value="generator" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200">
                <Sparkles className="h-4 w-4" />
                Generator
              </TabsTrigger>
              <TabsTrigger value="progress" disabled={!currentJob} className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200">
                <RefreshCw className="h-4 w-4" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="results" disabled={jobDrafts.length === 0} className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200">
                <BarChart3 className="h-4 w-4" />
                Results
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="generator" className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Content Input */}
            <div className="space-y-8">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    Content Strategy
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    Define your content goals and strategic approach
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="intent" className="text-sm font-semibold text-gray-700">Content Intent</Label>
                    <Select value={selectedIntent} onValueChange={setSelectedIntent}>
                      <SelectTrigger className="h-12 border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_INTENTS.map((intent) => (
                          <SelectItem key={intent.value} value={intent.value} className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{intent.label}</div>
                              <div className="text-sm text-gray-500 mt-1">{intent.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="topic" className="text-sm font-semibold text-gray-700">Topic or Key Message</Label>
                    <Textarea
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="min-h-[140px] border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="Enter your topic, idea, or key message for the LinkedIn post..."
                      disabled={isGenerating}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    Voice Guidelines
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    Maintain Andrew's authentic voice and tone
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveVoiceGuidelines} 
                      variant="outline" 
                      size="sm"
                      disabled={isSavingVoice || isGenerating}
                      className="border-gray-300 hover:border-purple-500 hover:text-purple-600"
                    >
                      {isSavingVoice ? 'Saving...' : 'Save Guidelines'}
                    </Button>
                  </div>
                  <Textarea
                    value={voiceGuidelines}
                    onChange={(e) => setVoiceGuidelines(e.target.value)}
                    className="min-h-[220px] border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                    placeholder="Enter Andrew's voice guidelines, tone preferences, and style notes..."
                    disabled={isGenerating}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Strategic Variants Selection */}
            <div className="space-y-8">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    Strategic Variants
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    Choose which content strategies to generate
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
                            ? `border-2 border-blue-500 shadow-lg bg-gradient-to-r from-blue-50/80 to-indigo-50/80` 
                            : 'border border-gray-200 hover:border-gray-300 bg-white/60'
                        }`}
                        onClick={() => toggleVariant(variant.type)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl transition-all duration-300 ${
                              isSelected ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-100'
                            }`}>
                              <Icon className={`h-6 w-6 ${
                                isSelected ? 'text-white' : 'text-gray-600'
                              }`} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-lg text-gray-900">{variant.name}</h3>
                                {isSelected && (
                                  <div className="p-1 bg-green-500 rounded-full">
                                    <CheckCircle className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-gray-600 mb-4 leading-relaxed">
                                {variant.description}
                              </p>
                              
                              <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 bg-gray-50/80 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm text-gray-700">Focus:</span>
                                    <span className="text-sm font-medium text-blue-600">
                                      {variant.focus}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-3 bg-gray-50/80 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm text-gray-700">Expected:</span>
                                    <span className="text-sm text-gray-600">
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

              <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-blue-50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    Generation Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center p-4 bg-white/60 rounded-lg">
                      <span className="font-semibold text-gray-700">Selected Variants:</span>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 px-3 py-1">
                        {selectedVariants.length} variants
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/60 rounded-lg">
                      <span className="font-semibold text-gray-700">Content Intent:</span>
                      <span className="text-gray-600 font-medium">
                        {CONTENT_INTENTS.find(i => i.value === selectedIntent)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/60 rounded-lg">
                      <span className="font-semibold text-gray-700">Platform:</span>
                      <span className="text-gray-600 font-medium">LinkedIn</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim() || selectedVariants.length === 0}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-base shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                        Generating Strategic Content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-3" />
                        Generate {selectedVariants.length} Strategic Variants
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-8">
          {currentJob ? (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-8">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-2xl">
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
                    <span className="text-lg font-semibold text-gray-700">Overall Progress</span>
                    <span className="text-2xl font-bold text-blue-600">{currentJob.progress}%</span>
                  </div>
                  <Progress value={currentJob.progress} className="w-full h-3 bg-gray-200" />
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
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Generation</h3>
              <p className="text-gray-500 text-lg">Start generating content to see progress here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-8">
          {jobDrafts.length > 0 ? (
            <>
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
                  Strategic Content Variants
                </h3>
                <p className="text-xl text-gray-600 mb-6">
                  {jobDrafts.length} performance-optimized variations generated
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
                    <Card key={draft.id} className="overflow-hidden shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                      <CardHeader className={`border-l-4 pb-6 ${
                        variant?.type === 'performance' ? 'border-amber-500 bg-gradient-to-r from-amber-50/80 to-orange-50/80' :
                        variant?.type === 'engagement' ? 'border-blue-500 bg-gradient-to-r from-blue-50/80 to-cyan-50/80' :
                        variant?.type === 'experimental' ? 'border-purple-500 bg-gradient-to-r from-purple-50/80 to-violet-50/80' :
                        'border-gray-300 bg-gray-50/80'
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
                              <h4 className="text-xl font-bold text-gray-900 mb-2">
                                {variant?.name || draft.agent_name.replace('_', ' ')}
                              </h4>
                              <p className="text-gray-600 font-medium">
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
                            <Button
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 py-2 shadow-lg transition-all duration-300 hover:shadow-xl"
                              onClick={() => handleCopyContent(draft.content.body)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Content
                            </Button>
                          </div>
                        </CardTitle>
                        
                        {variant && (
                          <CardDescription>
                            <div className="flex items-center gap-4 text-xs">
                              <span><strong>Focus:</strong> {variant.focus}</span>
                              <span><strong>Expected:</strong> {variant.expectedOutcome}</span>
                              <span><strong>Generation time:</strong> {draft.metadata.generation_time_ms}ms</span>
                            </div>
                          </CardDescription>
                        )}
                      </CardHeader>
                      
                      <CardContent className="space-y-6 pt-6">
                        <div className="prose prose-base max-w-none">
                          <div className="whitespace-pre-wrap bg-white rounded-xl p-6 border border-gray-200 text-gray-900 leading-relaxed text-base shadow-sm">
                            {draft.content.body}
                          </div>
                        </div>
                        
                        {/* Performance Insights */}
                        {draft.content.performance_prediction && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-lg">
                            <h4 className="font-bold text-base mb-4 flex items-center gap-3 text-blue-800">
                              <BarChart3 className="h-5 w-5" />
                              Performance Insights
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-6 mb-6">
                              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                                <div className="text-3xl font-bold text-green-600 mb-2">
                                  {draft.content.performance_prediction.predictedEngagement}
                                </div>
                                <div className="text-sm font-semibold text-gray-600">Predicted Engagement</div>
                              </div>
                              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                                <div className="text-3xl font-bold text-blue-600 mb-2">
                                  {draft.content.performance_prediction.confidenceScore}%
                                </div>
                                <div className="text-sm font-semibold text-gray-600">Confidence Score</div>
                              </div>
                            </div>
                            
                            {draft.content.performance_prediction.strengthFactors.length > 0 && (
                              <div className="mb-4">
                                <span className="font-bold text-sm text-green-700 mb-2 block">Strengths:</span>
                                <ul className="text-sm space-y-2">
                                  {draft.content.performance_prediction.strengthFactors.map((factor, i) => (
                                    <li key={i} className="text-green-700 flex items-start gap-3">
                                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> 
                                      <span>{factor}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {draft.content.performance_prediction.improvementSuggestions.length > 0 && (
                              <div>
                                <span className="font-bold text-sm text-amber-700 mb-2 block">Improvement Opportunities:</span>
                                <ul className="text-sm space-y-2">
                                  {draft.content.performance_prediction.improvementSuggestions.map((suggestion, i) => (
                                    <li key={i} className="text-amber-700 flex items-start gap-3">
                                      <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" /> 
                                      <span>{suggestion}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Historical Context */}
                        {(draft.metadata.similar_posts_analyzed && draft.metadata.similar_posts_analyzed > 0) && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 shadow-lg">
                            <h4 className="font-bold text-base mb-4 flex items-center gap-3 text-purple-800">
                              <Users className="h-5 w-5" />
                              Historical Intelligence
                            </h4>
                            <div className="grid grid-cols-2 gap-6 mb-4">
                              <div className="p-4 bg-white/60 rounded-xl">
                                <span className="font-semibold text-gray-700 block mb-2">Similar posts analyzed:</span>
                                <p className="text-2xl font-bold text-purple-700">{draft.metadata.similar_posts_analyzed}</p>
                              </div>
                              <div className="p-4 bg-white/60 rounded-xl">
                                <span className="font-semibold text-gray-700 block mb-2">Top performer reference:</span>
                                <p className="text-2xl font-bold text-purple-700">{draft.metadata.top_performer_score || 0} score</p>
                              </div>
                            </div>
                            <div className="p-4 bg-white/40 rounded-xl">
                              <p className="text-purple-800 font-medium">
                                This variation leverages patterns from Andrew's highest-performing similar content.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {draft.content.hashtags.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="font-semibold text-gray-700">Recommended Hashtags:</h5>
                            <div className="flex flex-wrap gap-3">
                              {draft.content.hashtags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 text-sm font-medium transition-colors">
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
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Content Generated</h3>
              <p className="text-gray-500 text-lg">Use the generator to create strategic variants and see results here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-8">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                Performance Analytics Dashboard
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Track content performance and optimize Andrew's voice evolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-20">
                <div className="p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                  <BarChart3 className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Analytics Coming Soon</h3>
                <p className="text-lg text-gray-600 mb-2">Performance analytics will appear here after content is posted and tracked.</p>
                <p className="text-gray-500">Real-time engagement tracking and voice evolution insights in development.</p>
                
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