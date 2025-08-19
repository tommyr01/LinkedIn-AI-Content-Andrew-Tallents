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
    <div className="max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generator
          </TabsTrigger>
          <TabsTrigger value="progress" disabled={!currentJob}>
            <RefreshCw className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="results" disabled={jobDrafts.length === 0}>
            <BarChart3 className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Content Input */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Content Strategy
                  </CardTitle>
                  <CardDescription>
                    Define your content goals and strategic approach
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="intent">Content Intent</Label>
                    <Select value={selectedIntent} onValueChange={setSelectedIntent}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_INTENTS.map((intent) => (
                          <SelectItem key={intent.value} value={intent.value}>
                            <div>
                              <div className="font-medium">{intent.label}</div>
                              <div className="text-sm text-muted-foreground">{intent.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic or Key Message</Label>
                    <Textarea
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="min-h-[120px]"
                      placeholder="Enter your topic, idea, or key message for the LinkedIn post..."
                      disabled={isGenerating}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Voice Guidelines
                  </CardTitle>
                  <CardDescription>
                    Maintain Andrew's authentic voice and tone
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveVoiceGuidelines} 
                      variant="outline" 
                      size="sm"
                      disabled={isSavingVoice || isGenerating}
                    >
                      {isSavingVoice ? 'Saving...' : 'Save Guidelines'}
                    </Button>
                  </div>
                  <Textarea
                    value={voiceGuidelines}
                    onChange={(e) => setVoiceGuidelines(e.target.value)}
                    className="min-h-[200px]"
                    placeholder="Enter Andrew's voice guidelines, tone preferences, and style notes..."
                    disabled={isGenerating}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Strategic Variants Selection */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Strategic Variants
                  </CardTitle>
                  <CardDescription>
                    Choose which content strategies to generate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {STRATEGIC_VARIANTS.map((variant) => {
                    const Icon = variant.icon
                    const isSelected = selectedVariants.includes(variant.type)
                    
                    return (
                      <Card 
                        key={variant.type} 
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? `border-2 ${variant.color} shadow-md` 
                            : 'border hover:border-gray-300'
                        }`}
                        onClick={() => toggleVariant(variant.type)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              isSelected ? variant.color : 'bg-gray-100'
                            }`}>
                              <Icon className={`h-5 w-5 ${
                                isSelected ? variant.color.split(' ')[0] : 'text-gray-600'
                              }`} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold">{variant.name}</h3>
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-3">
                                {variant.description}
                              </p>
                              
                              <div className="grid grid-cols-1 gap-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="font-medium">Focus:</span>
                                  <span className={variant.color.split(' ')[0]}>
                                    {variant.focus}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">Expected:</span>
                                  <span className="text-muted-foreground">
                                    {variant.expectedOutcome}
                                  </span>
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Generation Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Selected Variants:</span>
                      <Badge variant="outline">{selectedVariants.length} variants</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Content Intent:</span>
                      <span className="text-muted-foreground">
                        {CONTENT_INTENTS.find(i => i.value === selectedIntent)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Platform:</span>
                      <span className="text-muted-foreground">LinkedIn</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim() || selectedVariants.length === 0}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Strategic Content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate {selectedVariants.length} Strategic Variants
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progress">
          {currentJob ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {getStatusIcon(currentJob.status)}
                    Performance Content Generation
                  </span>
                  <Badge variant="outline" className={getStatusColor(currentJob.status)}>
                    {currentJob.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span>{currentJob.progress}%</span>
                  </div>
                  <Progress value={currentJob.progress} className="w-full h-2" />
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium block">Topic:</span>
                    <p className="text-muted-foreground mt-1">{currentJob.topic}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium block">Intent:</span>
                    <p className="text-muted-foreground mt-1">
                      {CONTENT_INTENTS.find(i => i.value === selectedIntent)?.label}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium block">Variants:</span>
                    <p className="text-muted-foreground mt-1">{selectedVariants.length} strategies</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium block">Platform:</span>
                    <p className="text-muted-foreground mt-1">LinkedIn</p>
                  </div>
                </div>

                {currentJob.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{currentJob.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No active generation job. Start generating content to see progress.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {jobDrafts.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Strategic Content Variants</h3>
                  <p className="text-muted-foreground">
                    {jobDrafts.length} performance-optimized variations generated
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {jobDrafts.filter(d => d.content.estimated_voice_score >= 85).length} High Voice Match
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {jobDrafts.filter(d => d.metadata.historical_context_used).length} Using Historical Data
                  </Badge>
                </div>
              </div>

              <div className="grid gap-6">
                {jobDrafts.map((draft, index) => {
                  const variant = STRATEGIC_VARIANTS.find(v => 
                    draft.agent_name.toLowerCase().includes(v.type)
                  )
                  const Icon = variant?.icon || Trophy
                  const stats = getVariantStats(draft)
                  
                  return (
                    <Card key={draft.id} className="overflow-hidden">
                      <CardHeader className={`border-l-4 ${variant?.color || 'border-gray-300'}`}>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${variant?.color || 'bg-gray-100'}`}>
                              <Icon className={`h-5 w-5 ${variant?.color.split(' ')[0] || 'text-gray-600'}`} />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold">
                                {variant?.name || draft.agent_name.replace('_', ' ')}
                              </h4>
                              <p className="text-sm text-muted-foreground font-normal">
                                Variant {draft.variant_number} • {draft.content.approach}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {stats.map((stat, statIndex) => (
                              <Badge key={statIndex} variant="outline" className={stat.color}>
                                {stat.label}: {stat.value}
                              </Badge>
                            ))}
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
                      
                      <CardContent className="space-y-4">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap bg-gray-50 rounded-lg p-4 text-sm leading-relaxed">
                            {draft.content.body}
                          </div>
                        </div>
                        
                        {/* Performance Insights */}
                        {draft.content.performance_prediction && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                              Performance Insights
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {draft.content.performance_prediction.predictedEngagement}
                                </div>
                                <div className="text-xs text-muted-foreground">Predicted Engagement</div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                  {draft.content.performance_prediction.confidenceScore}%
                                </div>
                                <div className="text-xs text-muted-foreground">Confidence Score</div>
                              </div>
                            </div>
                            
                            {draft.content.performance_prediction.strengthFactors.length > 0 && (
                              <div className="mb-3">
                                <span className="font-medium text-xs text-green-700">Strengths:</span>
                                <ul className="text-xs mt-1 space-y-1">
                                  {draft.content.performance_prediction.strengthFactors.map((factor, i) => (
                                    <li key={i} className="text-green-700 flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3" /> {factor}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {draft.content.performance_prediction.improvementSuggestions.length > 0 && (
                              <div>
                                <span className="font-medium text-xs text-amber-700">Improvement Opportunities:</span>
                                <ul className="text-xs mt-1 space-y-1">
                                  {draft.content.performance_prediction.improvementSuggestions.map((suggestion, i) => (
                                    <li key={i} className="text-amber-700 flex items-center gap-2">
                                      <TrendingUp className="h-3 w-3" /> {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Historical Context */}
                        {(draft.metadata.similar_posts_analyzed && draft.metadata.similar_posts_analyzed > 0) && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              Historical Intelligence
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="font-medium">Similar posts analyzed:</span>
                                <p className="text-purple-700 font-semibold">{draft.metadata.similar_posts_analyzed}</p>
                              </div>
                              <div>
                                <span className="font-medium">Top performer reference:</span>
                                <p className="text-purple-700 font-semibold">{draft.metadata.top_performer_score || 0} score</p>
                              </div>
                            </div>
                            <p className="text-purple-700 text-xs mt-2">
                              This variation leverages patterns from Andrew's highest-performing similar content.
                            </p>
                          </div>
                        )}
                        
                        {draft.content.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {draft.content.hashtags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No content generated yet. Use the generator to create strategic variants.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Analytics Dashboard
              </CardTitle>
              <CardDescription>
                Track content performance and optimize Andrew's voice evolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Performance analytics will appear here after content is posted and tracked.</p>
                <p className="text-sm mt-2">Coming soon: Real-time engagement tracking and voice evolution insights.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}