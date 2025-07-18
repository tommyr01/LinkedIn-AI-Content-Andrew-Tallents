"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Share, MessageCircle, Clock, CheckCircle, AlertCircle } from "lucide-react"

interface PostActionsProps {
  postId: string
  content: string
  hashtags?: string[]
  mentions?: string[]
  scheduledTime?: string
  onPostSuccess?: () => void
}

export function PostActions({ 
  postId, 
  content, 
  hashtags, 
  mentions, 
  scheduledTime,
  onPostSuccess 
}: PostActionsProps) {
  const [isPosting, setIsPosting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'posting' | 'completed' | 'failed'>('idle')

  const handlePostToLinkedIn = async () => {
    setIsPosting(true)
    setStatus('posting')
    
    try {
      const response = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content,
          hashtags,
          mentions,
          scheduledTime,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to post to LinkedIn')
      }

      setJobId(result.jobId)
      toast.success('Post sent to LinkedIn via Lindy!')
      
      // Poll for job status
      if (result.jobId) {
        pollJobStatus(result.jobId)
      }

      onPostSuccess?.()

    } catch (error) {
      console.error('Error posting to LinkedIn:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to post to LinkedIn')
      setStatus('failed')
    } finally {
      setIsPosting(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/linkedin/post?jobId=${jobId}`)
      const result = await response.json()

      if (result.status === 'completed') {
        setStatus('completed')
        toast.success('Post successfully published to LinkedIn!')
      } else if (result.status === 'failed') {
        setStatus('failed')
        toast.error('Failed to publish post to LinkedIn')
      } else if (result.status === 'pending' || result.status === 'processing') {
        // Continue polling
        setTimeout(() => pollJobStatus(jobId), 3000)
      }
    } catch (error) {
      console.error('Error checking job status:', error)
      setStatus('failed')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'posting':
        return <Clock className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Share className="h-4 w-4" />
    }
  }

  const getButtonText = () => {
    switch (status) {
      case 'posting':
        return 'Posting...'
      case 'completed':
        return 'Posted'
      case 'failed':
        return 'Failed - Retry'
      default:
        return 'Post to LinkedIn'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handlePostToLinkedIn}
        disabled={isPosting || status === 'completed'}
        variant={status === 'completed' ? 'secondary' : 'default'}
        size="sm"
      >
        {getStatusIcon()}
        {getButtonText()}
      </Button>

      {jobId && (
        <div className="text-xs text-muted-foreground">
          Job ID: {jobId}
        </div>
      )}
    </div>
  )
}

// Component for commenting on LinkedIn posts
interface CommentActionsProps {
  postUrl: string
  connectionId: string
  suggestedComments: string[]
  onCommentSuccess?: () => void
}

export function CommentActions({ 
  postUrl, 
  connectionId, 
  suggestedComments,
  onCommentSuccess 
}: CommentActionsProps) {
  const [selectedComment, setSelectedComment] = useState(suggestedComments[0] || '')
  const [isCommenting, setIsCommenting] = useState(false)

  const handleCommentOnLinkedIn = async () => {
    if (!selectedComment.trim()) {
      toast.error('Please select or enter a comment')
      return
    }

    setIsCommenting(true)
    
    try {
      const response = await fetch('/api/linkedin/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: selectedComment,
          postUrl,
          connectionId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to comment on LinkedIn')
      }

      toast.success('Comment sent to LinkedIn via Lindy!')
      onCommentSuccess?.()

    } catch (error) {
      console.error('Error commenting on LinkedIn:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to comment on LinkedIn')
    } finally {
      setIsCommenting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium">Comment</label>
        <textarea
          value={selectedComment}
          onChange={(e) => setSelectedComment(e.target.value)}
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Enter your comment..."
        />
      </div>

      {suggestedComments.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Suggested Comments</label>
          <div className="space-y-1">
            {suggestedComments.map((comment, index) => (
              <button
                key={index}
                onClick={() => setSelectedComment(comment)}
                className="w-full text-left p-2 rounded border hover:bg-accent text-sm"
              >
                {comment}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleCommentOnLinkedIn}
        disabled={isCommenting || !selectedComment.trim()}
        size="sm"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        {isCommenting ? 'Commenting...' : 'Comment on LinkedIn'}
      </Button>
    </div>
  )
}