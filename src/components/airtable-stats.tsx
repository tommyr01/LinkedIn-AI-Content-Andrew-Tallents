"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Clock, CheckCircle, Users, TrendingUp } from "lucide-react"

interface Stats {
  total: number
  published: number
  drafts: number
  pending: number
  scheduled: number
  totalEngagement: number
  avgEngagement: number
}

interface PostData {
  id: string
  fields: {
    Content: string
    Status: string
    'Created By': string
    'Likes': number
    'Comments': number
    'Views': number
    'Scheduled Date': string
  }
}

interface AirtableStatsProps {
  refreshTrigger?: number
}

export function AirtableStats({ refreshTrigger }: AirtableStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentPosts, setRecentPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [refreshTrigger])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/airtable/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentPosts(data.recentPosts || [])
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load stats from Airtable</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All content in Airtable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
            <p className="text-xs text-muted-foreground">
              Live on LinkedIn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Posts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drafts}</div>
            <p className="text-xs text-muted-foreground">
              Ready for review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEngagement}</div>
            <p className="text-xs text-muted-foreground">
              Total likes + comments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts from Airtable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.map((post, index) => (
                <div key={post.id} className="flex items-start space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none line-clamp-2">
                      {post.fields.Content?.substring(0, 100) || 'No content'}...
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span 
                        className={`px-2 py-1 rounded-full text-xs ${
                          post.fields.Status === 'Published' 
                            ? 'bg-green-100 text-green-800' 
                            : post.fields.Status === 'Draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {post.fields.Status}
                      </span>
                      <span>by {post.fields['Created By'] || 'Unknown'}</span>
                    </div>
                  </div>
                  {post.fields.Status === 'Published' && (
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{post.fields.Likes || 0} likes</div>
                      <div>{post.fields.Comments || 0} comments</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}