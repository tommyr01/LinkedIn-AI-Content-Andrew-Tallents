"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MessageSquare, ThumbsUp, ExternalLink, User, Sparkles, X, Play, Image, Calendar, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ConnectionPost } from "./connection-posts-table"

interface PostDetailDialogProps {
  post: ConnectionPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerateComment: (post: ConnectionPost) => void
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Post Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Author Header */}
          <div className="flex items-start space-x-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium shrink-0">
              {post.authorFirstName?.[0]}{post.authorLastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{post.connectionName}</h3>
                  {post.authorHeadline && (
                    <p className="text-muted-foreground text-sm mt-1">
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
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            </div>

            {/* Media Content */}
            {post.hasMedia && renderMedia()}
          </div>

          <Separator />

          {/* Engagement Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-lg font-semibold">{post.likesCount}</div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-lg font-semibold">{post.commentsCount}</div>
                    <div className="text-xs text-muted-foreground">Comments</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-lg font-semibold">{post.totalReactions}</div>
                    <div className="text-xs text-muted-foreground">Total Reactions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-lg font-semibold">{post.reposts}</div>
                    <div className="text-xs text-muted-foreground">Reposts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {formatDate(post.postedAt)}
            </div>
            <Button
              onClick={() => onGenerateComment(post)}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating && selectedPostId === post.id ? "Generating Comment..." : "Generate AI Comment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}