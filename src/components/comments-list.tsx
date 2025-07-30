"use client"

import { useState, useEffect } from "react"
import { MessageSquare, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Comment } from "./comment"
import { LinkedInComment } from "@/lib/linkedin-scraper"

interface CommentsListProps {
  postUrl: string
  initialCommentsCount?: number
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

export function CommentsList({ postUrl, initialCommentsCount = 0 }: CommentsListProps) {
  const [comments, setComments] = useState<LinkedInComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [totalComments, setTotalComments] = useState(initialCommentsCount)
  const [hasLoaded, setHasLoaded] = useState(false)

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
    setIsExpanded(true)
    if (!hasLoaded) {
      fetchComments()
    }
  }

  const handleRefreshComments = () => {
    fetchComments()
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
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {!hasLoaded && !isLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-lg mb-2">View Comments</CardTitle>
                <CardDescription className="mb-4">
                  Load comments from LinkedIn to see the conversation
                </CardDescription>
                <Button onClick={handleLoadComments} disabled={isLoading}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Load Comments
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
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load comments: {error}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchComments()}
                  className="ml-2"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
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
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}