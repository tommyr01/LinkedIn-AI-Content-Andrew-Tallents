'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Heart, Share2, Send, Sparkles, User } from 'lucide-react'
import { toast } from "sonner"

interface ConnectionPost {
  id: string
  author: string
  role: string
  content: string
  timeAgo: string
  likes: number
  comments: number
  imageUrl?: string
}

// Mock data for demonstration
const mockPosts: ConnectionPost[] = [
  {
    id: '1',
    author: 'Sarah Johnson',
    role: 'CEO at TechStartup Inc',
    content: 'Just closed our Series A funding! Excited to announce we raised $10M to expand our AI-powered analytics platform. Thanks to everyone who believed in our vision!',
    timeAgo: '2h',
    likes: 245,
    comments: 32
  },
  {
    id: '2',
    author: 'Michael Chen',
    role: 'VP of Sales at Enterprise Corp',
    content: 'Leadership tip: The best way to predict the future is to create it. What are you creating today?',
    timeAgo: '5h',
    likes: 189,
    comments: 27
  },
  {
    id: '3',
    author: 'Jennifer Williams',
    role: 'Founder at Growth Consulting',
    content: 'Three keys to scaling your business:\n\n1. Focus on customer success\n2. Build systems, not just solutions\n3. Invest in your team\n\nWhat would you add?',
    timeAgo: '1d',
    likes: 567,
    comments: 89
  }
]

export default function EngagementPage() {
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [generatingComment, setGeneratingComment] = useState(false)

  const generateComment = async (postContent: string) => {
    setGeneratingComment(true)
    try {
      // In a real implementation, this would call your AI API
      // For now, we'll simulate with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock AI-generated comment
      const suggestions = [
        "Great insights! I particularly resonated with your point about building systems. In my experience, sustainable growth comes from repeatable processes.",
        "Congratulations on this milestone! Your team's dedication to innovation is truly inspiring. Looking forward to seeing what you build next!",
        "This is exactly what leadership is about - creating the vision and empowering others to achieve it. Thanks for sharing!"
      ]
      
      setCommentText(suggestions[Math.floor(Math.random() * suggestions.length)])
      toast.success('Comment suggestion generated!')
    } catch (error) {
      toast.error('Failed to generate comment suggestion')
    } finally {
      setGeneratingComment(false)
    }
  }

  const postComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment')
      return
    }

    try {
      const response = await fetch('/api/linkedin/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postUrl: `https://linkedin.com/posts/${selectedPost}`,
          comment: commentText,
        }),
      })

      if (response.ok) {
        toast.success('Comment posted successfully!')
        setCommentText('')
        setSelectedPost(null)
      } else {
        toast.error('Failed to post comment')
      }
    } catch (error) {
      toast.error('Error posting comment')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Engagement Hub</h2>
        <Button>
          <MessageSquare className="mr-2 h-4 w-4" />
          Track New Connection
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">148</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments Posted</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">43</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections Tracked</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Key relationships
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Posts Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts from Key Connections</CardTitle>
          <CardDescription>
            Engage with posts from your tracked connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {mockPosts.map((post) => (
            <div key={post.id} className="space-y-4 border-b pb-6 last:border-0">
              <div className="flex items-start space-x-4">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="font-semibold">{post.author}</p>
                    <p className="text-sm text-muted-foreground">{post.role}</p>
                    <p className="text-xs text-muted-foreground">{post.timeAgo}</p>
                  </div>
                  <p className="text-sm">{post.content}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {post.comments}
                    </span>
                  </div>
                </div>
              </div>

              {selectedPost === post.id ? (
                <div className="ml-16 space-y-3">
                  <Textarea
                    placeholder="Write a thoughtful comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateComment(post.content)}
                      disabled={generatingComment}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {generatingComment ? 'Generating...' : 'Generate Comment'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={postComment}
                      disabled={!commentText.trim()}
                    >
                      Post Comment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPost(null)
                        setCommentText('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="ml-16">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPost(post.id)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Comment
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}