"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MessageSquare, ThumbsUp, ExternalLink, User, Sparkles, X, Play, Image, Calendar, TrendingUp, Repeat2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ConnectionPost } from "./connection-posts-table"
import { CommentsList } from "./comments-list"

interface PostDetailDialogProps {
  post: ConnectionPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerateComment?: (post: ConnectionPost) => void
  isGenerating: boolean
  selectedPostId?: string
}

export function PostDetailDialog({ 
  post, 
  open, 
  onOpenChange, 
  onGenerateComment, 
  isGenerating, 
  selectedPostId 
}: PostDetailDialogProps) {
  const [imageError, setImageError] = useState(false)
  const [profileImageError, setProfileImageError] = useState(false)
  
  // Comment generation states
  const [generatedComment, setGeneratedComment] = useState("")
  const [isGeneratingComment, setIsGeneratingComment] = useState(false)
  const [isPostingComment, setIsPostingComment] = useState(false)

  if (!post) return null

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a")
    } catch {
      return dateStr
    }
  }

  const formatRelativeDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
      
      if (diffInHours < 1) return "Just now"
      if (diffInHours < 24) return `${diffInHours}h ago`
      
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) return `${diffInDays}d ago`
      
      const diffInWeeks = Math.floor(diffInDays / 7)
      if (diffInWeeks < 4) return `${diffInWeeks}w ago`
      
      return format(date, "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  const renderMedia = () => {
    if (!post.hasMedia || !post.mediaUrl) return null

    const isVideo = post.mediaType?.toLowerCase().includes('video')
    const isImage = post.mediaType?.toLowerCase().includes('image') || post.mediaType?.toLowerCase().includes('photo')
    
    if (isVideo) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>Video Content</span>
          </div>
          <div className="relative w-full max-h-96 bg-muted rounded-lg overflow-hidden">
            {post.mediaThumbnail && !imageError ? (
              <img
                src={post.mediaThumbnail}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-muted">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors cursor-pointer">
              <div className="bg-black/60 rounded-full p-3">
                <Play className="h-8 w-8 text-white fill-white" />
              </div>
            </div>
          </div>
          {post.mediaUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(post.mediaUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on LinkedIn
            </Button>
          )}
        </div>
      )
    }

    if (isImage) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center space-x-2">
            <Image className="h-4 w-4" />
            <span>Image Content</span>
          </div>
          <div className="w-full max-h-96 bg-muted rounded-lg overflow-hidden">
            {(post.mediaThumbnail || post.mediaUrl) && !imageError ? (
              <img
                src={post.mediaThumbnail || post.mediaUrl}
                alt="Post image"
                className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
                onError={() => setImageError(true)}
                onClick={() => window.open(post.mediaUrl, '_blank')}
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-muted">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )
    }

    // Other media types
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Media Content</div>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-sm font-medium">
                {post.mediaType || 'Media'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Media content available on LinkedIn
              </div>
              {post.mediaUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open(post.mediaUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Media
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleGenerateComment = async () => {
    setIsGeneratingComment(true)
    try {
      // Call n8n webhook for comment generation
      const response = await fetch('/api/generate-comment-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postContent: post.content,
          authorName: post.connectionName,
          postUrl: post.postUrl,
          postId: post.id
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setGeneratedComment(data.generatedComment || "Generated comment will appear here...")
      toast.success('Comment generated successfully!')
    } catch (error) {
      console.error('Error generating comment:', error)
      toast.error('Failed to generate comment. Please try again.')
    } finally {
      setIsGeneratingComment(false)
    }
  }

  const handlePostComment = async () => {
    if (!generatedComment.trim()) {
      toast.error('Please enter a comment to post')
      return
    }

    setIsPostingComment(true)
    try {
      // Future: Post comment to LinkedIn via API
      // For now, just show success message
      toast.success('Comment posted successfully!')
      setGeneratedComment("")
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error('Failed to post comment. Please try again.')
    } finally {
      setIsPostingComment(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-[95vw] h-[85vh] overflow-hidden flex flex-col"
        style={{ width: '95vw', maxWidth: 'none', height: '85vh' }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Post Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
          {/* Left Column - Post Content */}
          <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
            {/* Author Header */}
            <div className="flex items-start space-x-4">
              {post.authorProfilePicture && !profileImageError ? (
                <img 
                  src={post.authorProfilePicture} 
                  alt={`${post.connectionName}'s profile`} 
                  className="h-12 w-12 rounded-full object-cover shrink-0"
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium shrink-0">
                  {post.authorFirstName?.[0]}{post.authorLastName?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-xl">{post.connectionName}</h3>
                    {post.authorHeadline && (
                      <p className="text-muted-foreground text-base mt-1">
                        {post.authorHeadline}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatRelativeDate(post.postedAt)}</span>
                      </div>
                      {post.postType && post.postType !== 'regular' && (
                        <Badge variant="outline">{post.postType}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {post.authorLinkedInUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(post.authorLinkedInUrl, '_blank')}
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    )}
                    {post.postUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(post.postUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Post
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Post Content */}
            <div className="space-y-6">
              <div className="prose prose-base max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              {/* Media Content */}
              {post.hasMedia && (
                <div className="w-full">
                  {renderMedia()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {formatDate(post.postedAt)}
              </div>
              {onGenerateComment && (
                <Button
                  onClick={() => onGenerateComment(post)}
                  disabled={isGenerating}
                  className="bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {isGenerating && selectedPostId === post.id ? "Generating Comment..." : "Generate AI Comment"}
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Compact Engagement & Comment Generation */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto pl-2">
            {/* Compact Engagement Metrics */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Engagement</h4>
              <div className="flex items-center justify-between text-sm bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{post.likesCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{post.commentsCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">{post.totalReactions}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Repeat2 className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{post.reposts}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-4">
              <CommentsList 
                postUrl={post.postUrl || ''}
                initialCommentsCount={post.commentsCount}
              />
            </div>

            {onGenerateComment && (
              <>
                <Separator />

                {/* Comment Generation Section */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-base">AI Comment Generation</h5>
                  
                  <Button 
                    onClick={handleGenerateComment}
                    disabled={isGeneratingComment}
                    className="w-full"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGeneratingComment ? "Generating..." : "Generate Comment"}
                  </Button>
                  
                  <Textarea
                    value={generatedComment}
                    onChange={(e) => setGeneratedComment(e.target.value)}
                    placeholder="Generated comment will appear here..."
                    className="min-h-[120px] text-sm"
                    disabled={isGeneratingComment}
                  />
                  
                  <Button 
                    onClick={handlePostComment}
                    disabled={!generatedComment.trim() || isPostingComment}
                    className="w-full"
                    variant="default"
                    size="sm"
                  >
                    {isPostingComment ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}