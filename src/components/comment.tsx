"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ThumbsUp, Heart, Lightbulb, Trophy, Users, MessageSquare, User, ChevronDown, ChevronUp, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { LinkedInComment } from "../lib/linkedin-scraper"
import { ProspectProfile } from "../lib/icp-scorer"
import { toast } from "sonner"

interface CommentProps {
  comment: LinkedInComment
  isReply?: boolean
  onResearchCommenter?: (prospect: ProspectProfile) => void
}

const REACTION_ICONS = {
  like: ThumbsUp,
  appreciation: Users,
  empathy: Heart,
  interest: Lightbulb,
  praise: Trophy,
}

const REACTION_COLORS = {
  like: "text-blue-500",
  appreciation: "text-purple-500", 
  empathy: "text-red-500",
  interest: "text-yellow-500",
  praise: "text-green-500",
}

export function Comment({ comment, isReply = false, onResearchCommenter }: CommentProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isResearching, setIsResearching] = useState(false)

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp)
      return format(date, "MMM d, yyyy 'at' h:mm a")
    } catch {
      return comment.posted_at.date
    }
  }

  const handleResearch = async () => {
    if (!onResearchCommenter || !comment.author.profile_url) {
      toast.error('Research not available for this comment')
      return
    }

    setIsResearching(true)
    try {
      console.log('🔍 Researching commenter:', comment.author.name)
      
      const response = await fetch('/api/research/commenter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileUrl: comment.author.profile_url,
          name: comment.author.name,
          headline: comment.author.headline
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        onResearchCommenter(data.prospect)
        toast.success(`Research completed for ${comment.author.name}`)
      } else {
        throw new Error(data.error || 'Failed to research commenter')
      }

    } catch (error: any) {
      console.error('Error researching commenter:', error)
      toast.error(`Research failed: ${error.message}`)
    } finally {
      setIsResearching(false)
    }
  }

  const getReactionSummary = () => {
    const reactions = comment.stats.reactions
    const nonZeroReactions = Object.entries(reactions).filter(([_, count]) => count > 0)
    
    if (nonZeroReactions.length === 0) return null

    return (
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        {nonZeroReactions.map(([type, count]) => {
          const Icon = REACTION_ICONS[type as keyof typeof REACTION_ICONS]
          const colorClass = REACTION_COLORS[type as keyof typeof REACTION_COLORS]
          
          return (
            <div key={type} className="flex items-center space-x-1">
              <Icon className={`h-3 w-3 ${colorClass}`} />
              <span>{count}</span>
            </div>
          )
        })}
        {comment.stats.total_reactions > 0 && (
          <span className="ml-2">
            {comment.stats.total_reactions} reaction{comment.stats.total_reactions !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${isReply ? 'ml-8 border-l-2 border-muted pl-4' : ''}`}>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          {/* Comment Header */}
          <div className="flex items-start space-x-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
              {comment.author.profile_picture && !imageError ? (
                <img
                  src={comment.author.profile_picture}
                  alt={comment.author.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={() => setImageError(true)}
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-sm truncate">
                    {comment.author.name}
                  </h4>
                  {comment.is_pinned && (
                    <Badge variant="secondary" className="text-xs">
                      Pinned
                    </Badge>
                  )}
                  {comment.is_edited && (
                    <span className="text-xs text-muted-foreground">
                      (edited)
                    </span>
                  )}
                </div>
                
                {onResearchCommenter && comment.author.profile_url && !isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResearch}
                    disabled={isResearching}
                    className="h-6 px-2 text-xs"
                  >
                    {isResearching ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Search className="h-3 w-3" />
                    )}
                    <span className="ml-1">
                      {isResearching ? 'Researching...' : 'Research'}
                    </span>
                  </Button>
                )}
              </div>
              
              {comment.author.headline && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {comment.author.headline}
                </p>
              )}
              
              <p className="text-xs text-muted-foreground">
                {comment.posted_at.relative} • {formatDate(comment.posted_at.timestamp)}
              </p>
            </div>
          </div>

          {/* Comment Text */}
          <div className="mb-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {comment.text}
            </p>
          </div>

          {/* Reactions and Stats */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex-1">
              {getReactionSummary()}
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {comment.stats.comments > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{comment.stats.comments} repl{comment.stats.comments !== 1 ? 'ies' : 'y'}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies Section */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {showReplies ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length} repl{comment.replies.length !== 1 ? 'ies' : 'y'}
            </span>
          </Button>

          {showReplies && (
            <div className="space-y-3">
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.comment_id}
                  comment={reply}
                  isReply={true}
                  onResearchCommenter={onResearchCommenter}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}