"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MessageSquare, ThumbsUp, ExternalLink, User, Sparkles, Play, Image, Heart, Zap, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ConnectionPost } from "./connection-posts-table"

interface PostCardProps {
  post: ConnectionPost
  onGenerateComment?: (post: ConnectionPost) => void
  onOpenDetails: (post: ConnectionPost) => void
  isGenerating: boolean
  selectedPostId?: string
}

export function PostCard({ 
  post, 
  onGenerateComment, 
  onOpenDetails, 
  isGenerating, 
  selectedPostId 
}: PostCardProps) {
  const [imageError, setImageError] = useState(false)
  const [profileImageError, setProfileImageError] = useState(false)

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, "MMM d, yyyy 'at' h:mm a")
    } catch {
      return dateStr
    }
  }

  const getMediaPreview = () => {
    if (!post.hasMedia || !post.mediaUrl) return null

    // Enhanced media type detection for LinkedIn documents
    const mediaUrl = post.mediaUrl.toLowerCase()
    const isVideo = post.mediaType?.toLowerCase().includes('video') || 
                   mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.avi')
    
    const isImage = post.mediaType?.toLowerCase().includes('image') || 
                   post.mediaType?.toLowerCase().includes('photo') ||
                   mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || 
                   mediaUrl.includes('.png') || mediaUrl.includes('.gif') ||
                   post.mediaThumbnail // If there's a thumbnail, it's likely visual content
    
    const isDocument = post.mediaType?.toLowerCase().includes('document') ||
                      mediaUrl.includes('.pdf') || mediaUrl.includes('.doc') || 
                      mediaUrl.includes('.ppt') || mediaUrl.includes('.xls')
    
    if (isVideo) {
      return (
        <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden group cursor-pointer">
          {post.mediaThumbnail && !imageError ? (
            <img
              src={post.mediaThumbnail}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
            <div className="bg-black/60 rounded-full p-2">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            Video
          </Badge>
        </div>
      )
    }

    if (isImage) {
      return (
        <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden cursor-pointer">
          {(post.mediaThumbnail || post.mediaUrl) && !imageError ? (
            <img
              src={post.mediaThumbnail || post.mediaUrl}
              alt="Post image"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            Image
          </Badge>
        </div>
      )
    }

    if (isDocument) {
      return (
        <div className="relative w-full bg-muted rounded-md overflow-hidden cursor-pointer border">
          {post.mediaThumbnail && !imageError ? (
            <div className="flex">
              <img
                src={post.mediaThumbnail}
                alt="Document preview"
                className="w-20 h-20 object-cover"
                onError={() => setImageError(true)}
              />
              <div className="flex-1 p-3 flex flex-col justify-center">
                <div className="text-sm font-medium truncate">
                  {post.documentTitle || 'Document'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {post.documentPageCount ? `${post.documentPageCount} pages` : 'PDF Document'}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium truncate">
                  {post.documentTitle || 'Document'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {post.documentPageCount ? `${post.documentPageCount} pages` : 'PDF Document'}
                </div>
              </div>
            </div>
          )}
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
            Document
          </Badge>
        </div>
      )
    }

    // Other media types
    return (
      <div className="w-full h-20 bg-muted rounded-md flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">
            {post.mediaType || 'Media'}
          </div>
          <div className="text-xs text-muted-foreground">
            Click to view
          </div>
        </div>
      </div>
    )
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <Card className="h-full max-w-md mx-auto hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-[1.02] relative overflow-hidden">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 to-amber-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {/* Card Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          {post.authorProfilePicture && !profileImageError ? (
            <img 
              src={post.authorProfilePicture} 
              alt={`${post.connectionName} profile picture`}
              className="h-10 w-10 rounded-full object-cover shrink-0"
              onError={() => setProfileImageError(true)}
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
              {post.authorFirstName?.[0]}{post.authorLastName?.[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {post.connectionName}
            </div>
            {post.authorHeadline && (
              <div className="text-xs text-muted-foreground line-clamp-2 leading-tight mt-1">
                {post.authorHeadline}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(post.postedAt)}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="pt-0 space-y-3" onClick={() => onOpenDetails(post)}>
        {/* Post Content */}
        <div className="space-y-2">
          <p className="text-sm leading-relaxed min-h-[120px]">
            {truncateText(post.content, 300)}
          </p>
          {post.content.length > 300 && (
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Read more...
            </button>
          )}
        </div>

        {/* Media Preview */}
        {post.hasMedia && (
          <div className="space-y-2">
            {getMediaPreview()}
          </div>
        )}

        {/* Post Type Badge */}
        {post.postType && post.postType !== 'regular' && (
          <div>
            <Badge variant="outline" className="text-xs">
              {post.postType}
            </Badge>
          </div>
        )}

        {/* Engagement Metrics with playful animations */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground group-hover:scale-105 transition-transform duration-200">
              <div className="relative">
                <ThumbsUp className="h-4 w-4 text-blue-500 group-hover:animate-pulse" />
                {post.likesCount > 50 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                )}
              </div>
              <span className="group-hover:font-medium transition-all">{post.likesCount}</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground group-hover:scale-105 transition-transform duration-200">
              <div className="relative">
                <MessageSquare className="h-4 w-4 text-green-500 group-hover:animate-pulse" />
                {post.commentsCount > 20 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                )}
              </div>
              <span className="group-hover:font-medium transition-all">{post.commentsCount}</span>
            </div>
            {post.totalReactions > (post.likesCount + post.commentsCount) && (
              <div className="text-xs text-muted-foreground flex items-center space-x-1 group-hover:scale-105 transition-transform duration-200">
                <Zap className="h-3 w-3 text-orange-500 group-hover:animate-pulse" />
                <span className="group-hover:font-medium transition-all">{post.totalReactions} total</span>
              </div>
            )}
            {/* High engagement indicator */}
            {post.totalReactions > 100 && (
              <div className="flex items-center space-x-1 text-xs bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">Hot!</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons with delightful hover effects */}
        <div className="flex items-center justify-start pt-2 space-x-1">
          {post.postUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                window.open(post.postUrl, '_blank')
              }}
              className="h-8 px-2 group/btn hover:bg-blue-50 transition-all duration-200 hover:scale-110"
            >
              <ExternalLink className="h-3 w-3 group-hover/btn:text-blue-600 group-hover/btn:rotate-12 transition-all duration-200" />
            </Button>
          )}
          
          {post.authorLinkedInUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                window.open(post.authorLinkedInUrl, '_blank')
              }}
              className="h-8 px-2 group/btn hover:bg-orange-50 transition-all duration-200 hover:scale-110"
            >
              <User className="h-3 w-3 group-hover/btn:text-orange-600 group-hover/btn:rotate-12 transition-all duration-200" />
            </Button>
          )}
          
          {/* Achievement badges for exceptional posts */}
          {post.totalReactions > 500 && (
            <div className="flex items-center space-x-1 ml-2">
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center space-x-1 animate-pulse">
                <Sparkles className="h-3 w-3" />
                <span className="font-medium">Viral</span>
              </div>
            </div>
          )}
          {post.totalReactions > 200 && post.totalReactions <= 500 && (
            <div className="flex items-center space-x-1 ml-2">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                <Heart className="h-3 w-3" />
                <span className="font-medium">Popular</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}