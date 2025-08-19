"use client"

import { useState, useEffect } from "react"
import { MessageSquare, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Comment } from "./comment"
import { ProspectResearchCard } from "./prospect-research-card"
import { LinkedInComment } from "../lib/linkedin-scraper"
import { ProspectProfile } from "../lib/icp-scorer"

interface CommentsListProps {
  postUrl: string
  initialCommentsCount?: number
  onConnectionAdded?: () => void
}

interface CommentsApiResponse {
  success: boolean
  data: {
    post: {
      id: string
      url: string
    }
    comments: LinkedInComment[]
    total: number
    meta: {
      pageNumber: number
      sortOrder: string
      commentsCount: number
    }
  }
  error?: string
  details?: string
}

export function CommentsList({ postUrl, initialCommentsCount = 0, onConnectionAdded }: CommentsListProps) {
  const [comments, setComments] = useState<LinkedInComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [totalComments, setTotalComments] = useState(initialCommentsCount)
  const [hasLoaded, setHasLoaded] = useState(false)
  
  // Research states
  const [researchedProspect, setResearchedProspect] = useState<ProspectProfile | null>(null)
  const [researchCardOpen, setResearchCardOpen] = useState(false)

  const fetchComments = async (showToast = true) => {
    if (!postUrl) {
      setError('No post URL provided')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching comments for post:', postUrl)
      
      const response = await fetch(`/api/posts/comments?postUrl=${encodeURIComponent(postUrl)}&pageNumber=1&sortOrder=Most%20relevant`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: CommentsApiResponse = await response.json()
      
      if (data.success) {
        setComments(data.data.comments)
        setTotalComments(data.data.total)
        setHasLoaded(true)
        
        console.log(`✅ Loaded ${data.data.comments.length} comments`)
        if (showToast) {
          toast.success(`Loaded ${data.data.comments.length} comments`)
        }
      } else {
        throw new Error(data.error || 'Failed to fetch comments')
      }

    } catch (error: any) {
      console.error('Error fetching comments:', error)
      setError(error.message)
      if (showToast) {
        toast.error(`Failed to load comments: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadComments = () => {
    fetchComments()
  }

  const handleRefreshComments = () => {
    fetchComments()
  }

  const handleResearchCommenter = (prospect: ProspectProfile) => {
    setResearchedProspect(prospect)
    setResearchCardOpen(true)
  }

  const handleAddToConnections = async (prospect: ProspectProfile) => {
    try {
      // Extract LinkedIn username from profile URL
      const linkedinUsername = extractLinkedInUsername(prospect.profileUrl)
      if (!linkedinUsername) {
        throw new Error('Could not extract LinkedIn username from profile URL')
      }

      toast.info('Adding connection and fetching LinkedIn posts...')

      // Create connection using the same API as the add connection modal
      console.log('🚀 Adding prospect to connections:', {
        name: prospect.name,
        username: linkedinUsername,
        profileUrl: prospect.profileUrl
      })

      const connectionResponse = await fetch('/api/connections/supabase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: linkedinUsername,
          createRecord: true,
          // Include prospect metadata for richer connection data
          prospectData: {
            icpScore: prospect.icpScore.totalScore,
            category: prospect.icpScore.category,
            tags: prospect.icpScore.tags,
            reasoning: prospect.icpScore.reasoning
          }
        })
      })

      if (!connectionResponse.ok) {
        const errorData = await connectionResponse.json()
        throw new Error(errorData.error || 'Failed to create connection')
      }

      const connectionData = await connectionResponse.json()
      console.log('✅ Connection created successfully:', connectionData)

      // Now sync their LinkedIn posts
      console.log('📄 Syncing LinkedIn posts for new connection...')
      
      const postsResponse = await fetch('/api/linkedin/posts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: linkedinUsername,
          maxPages: 1 // Fetch first page of posts
        })
      })

      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        console.log('📄 Posts sync completed:', postsData)
        toast.success(`Added ${prospect.name} to connections and synced ${postsData.data?.summary?.newPosts || 0} posts!`)
      } else {
        // Connection was created but posts sync failed - still show success
        console.warn('⚠️ Posts sync failed, but connection was created successfully')
        toast.success(`Added ${prospect.name} to connections! Posts sync will be attempted later.`)
      }

      // Trigger refresh of connections/posts if there's a callback
      onConnectionAdded?.()

    } catch (error: any) {
      console.error('💥 Error adding prospect to connections:', error)
      toast.error(`Failed to add ${prospect.name}: ${error.message}`)
    }
  }

  // Helper function to extract LinkedIn username from profile URL
  const extractLinkedInUsername = (profileUrl: string): string | null => {
    try {
      // Handle various LinkedIn URL formats:
      // https://linkedin.com/in/username
      // https://www.linkedin.com/in/username/
      // linkedin.com/in/username
      const match = profileUrl.match(/linkedin\.com\/in\/([^\/\?\s]+)/i)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  const getTotalReplies = (comments: LinkedInComment[]): number => {
    return comments.reduce((total, comment) => {
      return total + (comment.replies?.length || 0)
    }, 0)
  }

  const totalReplies = getTotalReplies(comments)
  const displayTotal = hasLoaded ? comments.length : totalComments

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-semibold text-lg">Comments</h4>
          <Badge variant="outline">
            {displayTotal} comment{displayTotal !== 1 ? 's' : ''}
            {totalReplies > 0 && ` • ${totalReplies} repl${totalReplies !== 1 ? 'ies' : 'y'}`}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {hasLoaded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshComments}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
          {!hasLoaded && !isLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-lg mb-2">View LinkedIn Comments</CardTitle>
                <CardDescription className="mb-4">
                  Load comments from LinkedIn to see the conversation
                </CardDescription>
                <Button onClick={handleLoadComments} disabled={isLoading} size="lg" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Load Comments from LinkedIn
                </Button>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading comments...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 mb-2">
                      Failed to load comments: {error}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchComments()}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasLoaded && !isLoading && comments.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-lg mb-2">No Comments</CardTitle>
                <CardDescription>
                  This post doesn't have any comments yet.
                </CardDescription>
              </CardContent>
            </Card>
          )}

          {hasLoaded && comments.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Comment
                    key={comment.comment_id}
                    comment={comment}
                    onResearchCommenter={handleResearchCommenter}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      {/* Prospect Research Card */}
      <ProspectResearchCard
        prospect={researchedProspect}
        open={researchCardOpen}
        onOpenChange={setResearchCardOpen}
        onAddToConnections={handleAddToConnections}
      />
    </div>
  )
}