"use client"

import * as React from "react"
import { useState } from "react"
import { format } from "date-fns"
import { 
  Search, 
  ExternalLink, 
  Building, 
  User, 
  Calendar, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  MessageSquare,
  Plus
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

// Types for lead data
export type Lead = {
  id: string
  name: string
  profileUrl: string
  role?: string
  company?: string
  companySize?: '1-50' | '51-200' | '201-500' | '501-1000' | '1000+'
  tenureMonths?: number
  icpScore: number
  scoreBreakdown?: Record<string, { score: number; reasoning: string }>
  tags: string[]
  notes?: string
  status: 'New' | 'Qualified' | 'Engaged' | 'Not ICP'
  researchData?: string // JSON string
  createdAt: string
}

export type ResearchJob = {
  jobId: string
  status: 'triggered' | 'processing' | 'completed' | 'failed'
  profileUrl: string
  estimatedCompletionTime?: string
  message: string
}

interface LeadResearchSheetProps {
  trigger: React.ReactNode
  onLeadCreated?: (lead: Lead) => void
  onLeadUpdated?: (lead: Lead) => void
  existingLead?: Lead | null
}

export function LeadResearchSheet({ 
  trigger, 
  onLeadCreated, 
  onLeadUpdated, 
  existingLead 
}: LeadResearchSheetProps) {
  const [open, setOpen] = useState(false)
  const [profileUrl, setProfileUrl] = useState(existingLead?.profileUrl || '')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [customNotes, setCustomNotes] = useState(existingLead?.notes || '')
  const [customTags, setCustomTags] = useState<string[]>(existingLead?.tags || [])
  const [newTag, setNewTag] = useState('')
  
  // Research states
  const [isResearching, setIsResearching] = useState(false)
  const [researchJob, setResearchJob] = useState<ResearchJob | null>(null)
  const [researchResult, setResearchResult] = useState<Lead | null>(existingLead || null)
  const [error, setError] = useState<string | null>(null)

  // Polling for research completion
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (researchJob && researchJob.status === 'processing') {
      interval = setInterval(async () => {
        try {
          // In a real implementation, you'd have an endpoint to check job status
          // For now, we'll simulate completion after a delay
          if (Date.now() - parseInt(researchJob.jobId.split('_')[1]) > 10000) {
            // Simulate completed research - in reality this would come from webhook
            setResearchJob(prev => prev ? { ...prev, status: 'completed' } : null)
          }
        } catch (error) {
          console.error('Error polling research status:', error)
        }
      }, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [researchJob])

  const handleResearchTrigger = async () => {
    if (!profileUrl) {
      toast.error('Please enter a LinkedIn profile URL')
      return
    }

    if (!profileUrl.includes('linkedin.com/in/')) {
      toast.error('Please enter a valid LinkedIn profile URL')
      return
    }

    setIsResearching(true)
    setError(null)
    setResearchResult(null)

    try {
      const response = await fetch('/api/research/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileUrl,
          priority,
          notes: customNotes,
          tags: customTags,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to trigger research')
      }

      const result = await response.json()
      
      setResearchJob({
        jobId: result.jobId,
        status: 'processing',
        profileUrl,
        estimatedCompletionTime: result.estimatedCompletionTime,
        message: result.message
      })

      toast.success('Research started! This will take 2-5 minutes.')

    } catch (error) {
      console.error('Error triggering research:', error)
      setError('Failed to start research. Please try again.')
      toast.error('Failed to start research')
    } finally {
      setIsResearching(false)
    }
  }

  const handleAddTag = () => {
    if (newTag && !customTags.includes(newTag)) {
      setCustomTags([...customTags, newTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(tag => tag !== tagToRemove))
  }

  const handleUpdateLead = async () => {
    if (!researchResult) return

    try {
      // Update lead with custom notes and tags
      const updatedLead: Lead = {
        ...researchResult,
        notes: customNotes,
        tags: [...new Set([...researchResult.tags, ...customTags])],
      }

      // In a real implementation, you'd make an API call to update the lead in Airtable
      // For now, we'll just call the callback
      if (onLeadUpdated) {
        onLeadUpdated(updatedLead)
      }

      toast.success('Lead updated successfully')
      setOpen(false)

    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Failed to update lead')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    if (score >= 40) return 'bg-orange-100'
    return 'bg-red-100'
  }

  const getRecommendationBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">Hot Lead</Badge>
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Warm Lead</Badge>
    if (score >= 40) return <Badge className="bg-orange-100 text-orange-800">Cold Lead</Badge>
    return <Badge variant="secondary">Not ICP</Badge>
  }

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(profileUrl)
    toast.success('Profile URL copied to clipboard')
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {existingLead ? 'Lead Research Results' : 'LinkedIn Lead Research'}
          </SheetTitle>
          <SheetDescription>
            {existingLead 
              ? 'Review and update lead information'
              : 'Research a LinkedIn profile to assess ICP fit and generate insights'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Profile URL Input */}
          <div className="space-y-2">
            <Label htmlFor="profileUrl">LinkedIn Profile URL</Label>
            <div className="flex space-x-2">
              <Input
                id="profileUrl"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                placeholder="https://linkedin.com/in/john-smith/"
                disabled={isResearching || !!existingLead}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyProfileUrl}
                disabled={!profileUrl}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Research Controls (only if no existing lead) */}
          {!existingLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Research Priority</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleResearchTrigger}
                disabled={isResearching || !profileUrl}
                className="w-full"
              >
                {isResearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Research...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Start Research
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Research Job Status */}
          {researchJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {researchJob.status === 'processing' && <Clock className="h-5 w-5 text-blue-500" />}
                  {researchJob.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {researchJob.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  <span>Research Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status:</span>
                    <Badge variant={
                      researchJob.status === 'completed' ? 'default' :
                      researchJob.status === 'failed' ? 'destructive' :
                      'secondary'
                    }>
                      {researchJob.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{researchJob.message}</p>
                  {researchJob.estimatedCompletionTime && (
                    <p className="text-xs text-muted-foreground">
                      Estimated completion: {researchJob.estimatedCompletionTime}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Research Results */}
          {researchResult && (
            <div className="space-y-4">
              {/* Lead Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>{researchResult.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getRecommendationBadge(researchResult.icpScore)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(researchResult.profileUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {researchResult.role} {researchResult.company && `at ${researchResult.company}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {researchResult.company && (
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{researchResult.company}</span>
                        {researchResult.companySize && (
                          <Badge variant="outline">{researchResult.companySize}</Badge>
                        )}
                      </div>
                    )}
                    {researchResult.tenureMonths !== undefined && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {Math.floor(researchResult.tenureMonths / 12)} years, {researchResult.tenureMonths % 12} months in role
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ICP Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>ICP Score</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        <span className={getScoreColor(researchResult.icpScore)}>
                          {researchResult.icpScore}/100
                        </span>
                      </span>
                      <div className={`px-3 py-1 rounded-full ${getScoreBgColor(researchResult.icpScore)}`}>
                        <span className={`text-sm font-medium ${getScoreColor(researchResult.icpScore)}`}>
                          {researchResult.icpScore >= 80 ? 'Excellent Fit' :
                           researchResult.icpScore >= 60 ? 'Good Fit' :
                           researchResult.icpScore >= 40 ? 'Fair Fit' : 'Poor Fit'}
                        </span>
                      </div>
                    </div>
                    
                    <Progress value={researchResult.icpScore} className="h-2" />

                    {/* Score Breakdown */}
                    {researchResult.scoreBreakdown && (
                      <div className="space-y-2">
                        <Label>Score Breakdown:</Label>
                        <div className="space-y-1">
                          {Object.entries(researchResult.scoreBreakdown).map(([factor, data]) => (
                            <div key={factor} className="text-sm">
                              <div className="flex items-center justify-between">
                                <span className="capitalize">{factor}:</span>
                                <span className={getScoreColor(data.score)}>{data.score}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground ml-2">{data.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {[...researchResult.tags, ...customTags].map((tag, index) => (
                        <Badge
                          key={`${tag}-${index}`}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add custom tag..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleAddTag}
                        disabled={!newTag}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Add custom notes about this lead..."
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Research Timestamp */}
              <div className="text-xs text-muted-foreground text-center">
                Research completed: {format(new Date(researchResult.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button onClick={handleUpdateLead} className="flex-1">
                  {existingLead ? 'Update Lead' : 'Save Lead'}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Convenience wrapper for trigger button
export function ResearchButton({ 
  profileUrl, 
  size = "sm", 
  variant = "outline",
  onLeadCreated 
}: { 
  profileUrl?: string
  size?: "sm" | "default" | "lg"
  variant?: "outline" | "default" | "secondary" | "ghost"
  onLeadCreated?: (lead: Lead) => void 
}) {
  return (
    <LeadResearchSheet
      trigger={
        <Button variant={variant} size={size}>
          <Search className="h-4 w-4 mr-1" />
          Research
        </Button>
      }
      onLeadCreated={onLeadCreated}
    />
  )
}