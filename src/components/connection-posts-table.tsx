"use client"

import * as React from "react"
import { useState } from "react"
import { MessageSquare, ThumbsUp, User, TrendingUp, Search, Grid, List, Coffee, Sparkles, Zap, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { PostCard } from "./post-card"
import { PostDetailDialog } from "./post-detail-dialog"

// Types based on our connection posts data structure
export type ConnectionPost = {
  id: string
  connectionName: string
  connectionCompany?: string
  content: string
  postedAt: string
  postUrn: string
  postUrl?: string
  likesCount: number
  commentsCount: number
  totalReactions: number
  reposts: number
  authorFirstName: string
  authorLastName: string
  authorHeadline?: string
  authorLinkedInUrl?: string
  authorProfilePicture?: string
  postType: string
  mediaType?: string
  mediaUrl?: string
  mediaThumbnail?: string
  createdTime: string
  hasMedia?: boolean
  documentTitle?: string
  documentPageCount?: number
}

export type PostStats = {
  totalPosts: number
  totalLikes: number
  totalComments: number
  totalReactions: number
  uniqueConnections: number
  averageEngagement: number
}

export type GeneratedComment = {
  id: string
  text: string
  approach: string
  length: number
  qualityScore: number
  voice: 'andrew' | 'generic'
  style: 'professional' | 'engaging' | 'thoughtful' | 'supportive'
}

interface ConnectionPostsTableProps {
  posts: ConnectionPost[]
  stats: PostStats
  onRefresh?: () => void
  isLoading?: boolean
  showCommentGeneration?: boolean
}

export function ConnectionPostsTable({ posts, stats, onRefresh, isLoading = false, showCommentGeneration = true }: ConnectionPostsTableProps) {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [timeFilter, setTimeFilter] = useState<"all" | "1day" | "3day" | "7day" | "1month">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 12

  // Dialog states
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<ConnectionPost | null>(null)
  const [postDetailOpen, setPostDetailOpen] = useState(false)

  // Comment generation states
  const [selectedPost, setSelectedPost] = useState<ConnectionPost | null>(null)
  const [generatedComments, setGeneratedComments] = useState<GeneratedComment[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedComment, setSelectedComment] = useState<GeneratedComment | null>(null)
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)

  // Filter and search logic
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.connectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.authorHeadline && post.authorHeadline.toLowerCase().includes(searchTerm.toLowerCase()))

    // Time filter logic
    const matchesTimeFilter = (() => {
      if (timeFilter === "all") return true
      
      const postDate = new Date(post.postedAt)
      const now = new Date()
      const diffInMs = now.getTime() - postDate.getTime()
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24)
      
      switch (timeFilter) {
        case "1day": return diffInDays <= 1
        case "3day": return diffInDays <= 3
        case "7day": return diffInDays <= 7
        case "1month": return diffInDays <= 30
        default: return true
      }
    })()

    return matchesSearch && matchesTimeFilter
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage)
  const startIndex = (currentPage - 1) * postsPerPage
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage)

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, timeFilter])

  const handleOpenPostDetail = (post: ConnectionPost) => {
    setSelectedPostForDetail(post)
    setPostDetailOpen(true)
  }

  const handleGenerateComment = async (post: ConnectionPost) => {
    setSelectedPost(post)
    setIsGenerating(true)
    setGeneratedComments([])

    try {
      const response = await fetch('/api/content/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post.id,
          postContent: post.content,
          connectionName: post.connectionName,
          commentStyle: 'professional',
          andrew_voice: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate comments')
      }

      const result = await response.json()
      setGeneratedComments(result.comments)
      setCommentDialogOpen(true)
      
      toast.success(`Generated ${result.comments.length} comment variations`)

    } catch (error) {
      console.error('Error generating comments:', error)
      toast.error('Failed to generate comments. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectComment = (comment: GeneratedComment) => {
    setSelectedComment(comment)
  }

  const handleApproveComment = async () => {
    if (!selectedComment || !selectedPost) return

    try {
      // Here you would typically update the selected comment in Airtable
      // and potentially trigger the Lindy webhook for posting
      
      toast.success('Comment approved and ready for posting')
      setCommentDialogOpen(false)
      setSelectedComment(null)
      setGeneratedComments([])
      
      // Optionally refresh the table to show updated status
      if (onRefresh) {
        onRefresh()
      }

    } catch (error) {
      console.error('Error approving comment:', error)
      toast.error('Failed to approve comment. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-muted-foreground">
            {filteredPosts.length} of {posts.length} posts
            {(searchTerm || timeFilter !== "all") && " (filtered)"}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="group hover:shadow-md transition-all duration-300 hover:scale-105"
          >
            {viewMode === "grid" ? (
              <List className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
            ) : (
              <Grid className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
            )}
            <span className="ml-2 hidden sm:inline group-hover:font-medium transition-all">
              {viewMode === "grid" ? "List View" : "Grid View"}
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="group hover:shadow-md transition-all duration-300 hover:scale-105 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            <span className="relative group-hover:font-medium transition-all">
              {isLoading ? (
                <span className="flex items-center space-x-1">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Syncing...</span>
                </span>
              ) : (
                "Refresh"
              )}
            </span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search posts, names, or headlines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={timeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("all")}
            >
              All
            </Button>
            <Button
              variant={timeFilter === "1day" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("1day")}
            >
              1 Day
            </Button>
            <Button
              variant={timeFilter === "3day" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("3day")}
            >
              3 Days
            </Button>
            <Button
              variant={timeFilter === "7day" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("7day")}
            >
              7 Days
            </Button>
            <Button
              variant={timeFilter === "1month" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("1month")}
            >
              1 Month
            </Button>
          </div>
        </div>
      </div>

      {/* Posts Grid/List with delightful loading */}
      {isLoading ? (
        <div className="space-y-6">
          {/* Playful loading message */}
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-2 text-orange-600">
              <Coffee className="h-6 w-6 animate-bounce" />
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-lg font-medium animate-pulse">Brewing your content insights...</span>
              <Sparkles className="h-5 w-5 animate-pulse" />
              <Zap className="h-6 w-6 animate-bounce" style={{ animationDelay: '0.5s' }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2 animate-in fade-in duration-1000 delay-500">
              Analyzing engagement patterns and preparing executive summaries
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-80 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 to-amber-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-6 relative">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gradient-to-r from-orange-200 to-amber-200 rounded w-24 animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.2}s` }}></div>
                        <div className="h-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded w-32 animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.4}s` }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.6}s` }}></div>
                      <div className="h-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.8}s` }}></div>
                      <div className="h-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded w-3/4 animate-pulse" style={{ animationDelay: `${i * 0.1 + 1}s` }}></div>
                    </div>
                    <div className="h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 1.2}s` }}></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-amber-50/30" />
          <CardContent className="flex flex-col items-center justify-center py-16 relative">
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
              <div className="flex items-center justify-center space-x-2">
                {searchTerm || timeFilter !== "all" ? (
                  <>
                    <Search className="h-12 w-12 text-orange-400 animate-pulse" />
                    <Target className="h-8 w-8 text-amber-400 animate-bounce" />
                  </>
                ) : (
                  <>
                    <Coffee className="h-12 w-12 text-orange-400 animate-bounce" />
                    <Sparkles className="h-10 w-10 text-amber-400 animate-pulse" />
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-semibold text-muted-foreground">
                  {searchTerm || timeFilter !== "all" ? "No matching posts found" : "Ready to analyze your content empire"}
                </div>
                <div className="text-muted-foreground max-w-md">
                  {searchTerm || timeFilter !== "all" 
                    ? "Try adjusting your search terms or time filters to discover more content" 
                    : "Your LinkedIn posts will appear here once synced. Click 'Refresh from LinkedIn' to begin building your content analytics dashboard"}
                </div>
              </div>
              
              {!(searchTerm || timeFilter !== "all") && (
                <div className="bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 rounded-lg p-4 max-w-md">
                  <p className="text-sm text-orange-800 font-medium">
                    💡 Pro tip: Regular content analysis helps identify your most engaging topics and optimal posting times!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
          : "space-y-4 max-w-2xl mx-auto"
        }>
          {paginatedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onGenerateComment={showCommentGeneration ? handleGenerateComment : undefined}
              onOpenDetails={handleOpenPostDetail}
              isGenerating={isGenerating}
              selectedPostId={selectedPost?.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + postsPerPage, filteredPosts.length)} of {filteredPosts.length} posts
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                const isCurrentPage = page === currentPage
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Comment Generation Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-6xl w-[90vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Comments</DialogTitle>
            <DialogDescription>
              Choose a comment to engage with {selectedPost?.connectionName}'s post
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4">
              {/* Original Post Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Original Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {selectedPost.content}
                  </p>
                </CardContent>
              </Card>

              {/* Generated Comments */}
              <div className="space-y-3">
                <Label>Generated Comment Options:</Label>
                {generatedComments.map((comment) => (
                  <Card
                    key={comment.id}
                    className={`cursor-pointer transition-colors ${
                      selectedComment?.id === comment.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-card/30"
                    }`}
                    onClick={() => handleSelectComment(comment)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm">{comment.text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {comment.approach}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Quality: {comment.qualityScore}%
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {comment.voice === 'andrew' ? 'Andrew\'s Voice' : 'Professional'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Selected Comment Preview */}
              {selectedComment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Comment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={selectedComment.text}
                      readOnly
                      className="min-h-[80px]"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedComment.text.length} characters
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveComment}
              disabled={!selectedComment}
            >
              Approve & Post Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Detail Dialog */}
      <PostDetailDialog
        post={selectedPostForDetail}
        open={postDetailOpen}
        onOpenChange={setPostDetailOpen}
        onGenerateComment={showCommentGeneration ? handleGenerateComment : undefined}
        isGenerating={isGenerating}
        selectedPostId={selectedPost?.id}
      />
    </div>
  )
}