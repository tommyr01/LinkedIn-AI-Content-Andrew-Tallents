"use client"

import * as React from "react"
import { useState } from "react"
import { MessageSquare, ThumbsUp, User, TrendingUp, Search, Grid, List } from "lucide-react"

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
}

export function ConnectionPostsTable({ posts, stats, onRefresh, isLoading = false }: ConnectionPostsTableProps) {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [mediaFilter, setMediaFilter] = useState<"all" | "text" | "image" | "video">("all")
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

    const matchesMediaFilter = 
      mediaFilter === "all" ||
      (mediaFilter === "text" && !post.hasMedia) ||
      (mediaFilter === "image" && post.mediaType?.toLowerCase().includes('image')) ||
      (mediaFilter === "video" && post.mediaType?.toLowerCase().includes('video'))

    return matchesSearch && matchesMediaFilter
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage)
  const startIndex = (currentPage - 1) * postsPerPage
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage)

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, mediaFilter])

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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.uniqueConnections} connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReactions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLikes} likes, {stats.totalComments} comments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageEngagement}</div>
            <p className="text-xs text-muted-foreground">
              Reactions per post
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueConnections}</div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header with stats and controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Connection Posts</h2>
          <p className="text-muted-foreground">
            {filteredPosts.length} of {posts.length} posts
            {(searchTerm || mediaFilter !== "all") && " (filtered)"}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
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
              variant={mediaFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setMediaFilter("all")}
            >
              All
            </Button>
            <Button
              variant={mediaFilter === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setMediaFilter("text")}
            >
              Text
            </Button>
            <Button
              variant={mediaFilter === "image" ? "default" : "outline"}
              size="sm"
              onClick={() => setMediaFilter("image")}
            >
              Images
            </Button>
            <Button
              variant={mediaFilter === "video" ? "default" : "outline"}
              size="sm"
              onClick={() => setMediaFilter("video")}
            >
              Videos
            </Button>
          </div>
        </div>
      </div>

      {/* Posts Grid/List */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-80">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-32"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="text-2xl font-semibold text-muted-foreground">No posts found</div>
              <div className="text-muted-foreground">
                {searchTerm || mediaFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "No connection posts available yet"}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
          : "space-y-4"
        }>
          {paginatedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onGenerateComment={handleGenerateComment}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                        : "hover:bg-muted/50"
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
        onGenerateComment={handleGenerateComment}
        isGenerating={isGenerating}
        selectedPostId={selectedPost?.id}
      />
    </div>
  )
}