"use client"

import * as React from "react"
import { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { MessageSquare, ThumbsUp, ExternalLink, User, Calendar, TrendingUp, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

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
  createdTime: string
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
  const [sorting, setSorting] = useState<SortingState>([
    { id: "postedAt", desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  // Comment generation states
  const [selectedPost, setSelectedPost] = useState<ConnectionPost | null>(null)
  const [generatedComments, setGeneratedComments] = useState<GeneratedComment[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedComment, setSelectedComment] = useState<GeneratedComment | null>(null)
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)

  const columns: ColumnDef<ConnectionPost>[] = [
    {
      accessorKey: "connectionName",
      header: "Connection",
      cell: ({ row }) => {
        const post = row.original
        return (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {post.authorFirstName?.[0]}{post.authorLastName?.[0]}
            </div>
            <div className="flex flex-col">
              <div className="font-medium">{post.connectionName}</div>
              {post.authorHeadline && (
                <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                  {post.authorHeadline}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "content",
      header: "Post Content",
      cell: ({ row }) => {
        const content = row.getValue("content") as string
        return (
          <div className="max-w-[400px]">
            <p className="text-sm line-clamp-3">{content}</p>
            {content.length > 200 && (
              <span className="text-xs text-muted-foreground">
                +{content.length - 200} more characters
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "postedAt",
      header: "Posted",
      cell: ({ row }) => {
        const dateStr = row.getValue("postedAt") as string
        try {
          const date = new Date(dateStr)
          return (
            <div className="text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{format(date, "MMM d, yyyy")}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(date, "h:mm a")}
              </div>
            </div>
          )
        } catch {
          return (
            <div className="text-sm text-muted-foreground">
              {dateStr}
            </div>
          )
        }
      },
    },
    {
      accessorKey: "engagement",
      header: "Engagement",
      cell: ({ row }) => {
        const post = row.original
        return (
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-sm">
                <ThumbsUp className="h-4 w-4 mr-1 text-blue-500" />
                {post.likesCount}
              </div>
              <div className="flex items-center text-sm">
                <MessageSquare className="h-4 w-4 mr-1 text-green-500" />
                {post.commentsCount}
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              {post.totalReactions} total reactions
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "postType",
      header: "Type",
      cell: ({ row }) => {
        const postType = row.getValue("postType") as string
        const mediaType = row.original.mediaType
        
        return (
          <div className="flex flex-col space-y-1">
            <Badge variant="outline">
              {postType || 'regular'}
            </Badge>
            {mediaType && (
              <Badge variant="secondary" className="text-xs">
                {mediaType}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const post = row.original

        return (
          <div className="flex items-center space-x-2">
            {post.postUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(post.postUrl, '_blank')}
                title="View on LinkedIn"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            
            {post.authorLinkedInUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(post.authorLinkedInUrl, '_blank')}
                title="View Profile"
              >
                <User className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateComment(post)}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {isGenerating && selectedPost?.id === post.id ? "Generating..." : "Generate Comment"}
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: posts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

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

  const filteredPosts = table.getFilteredRowModel().rows.length
  const totalPosts = posts.length

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
            {filteredPosts} of {totalPosts} posts
            {columnFilters.length > 0 && " (filtered)"}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
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
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Filter by connection name..."
          value={(table.getColumn("connectionName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("connectionName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Input
          placeholder="Filter by content..."
          value={(table.getColumn("content")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("content")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "Loading posts..." : "No posts found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

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
    </div>
  )
}