'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus, Settings, TrendingUp } from 'lucide-react'
import { toast } from "sonner"
import { ConnectionPostsTable, type ConnectionPost, type PostStats } from '@/components/connection-posts-table'

export default function EngagementPage() {
  const [posts, setPosts] = useState<ConnectionPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<PostStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalReactions: 0,
    uniqueConnections: 0,
    averageEngagement: 0
  })

  // Fetch connection posts from Airtable
  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      console.log('🔍 Fetching connection posts...')
      
      const response = await fetch('/api/posts/list?maxRecords=100&sortField=Posted Date&sortDirection=desc', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setPosts(data.posts)
        setStats(data.stats)
        
        console.log(`✅ Loaded ${data.posts.length} connection posts`)
        toast.success(`Loaded ${data.posts.length} connection posts`)
      } else {
        throw new Error(data.error || 'Failed to fetch posts')
      }

    } catch (error: any) {
      console.error('Error fetching connection posts:', error)
      toast.error(`Failed to load connection posts: ${error.message}`)
      
      // Set empty state on error
      setPosts([])
      setStats({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalReactions: 0,
        uniqueConnections: 0,
        averageEngagement: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh posts data
  const refreshPosts = async () => {
    toast.info('Refreshing connection posts...')
    await fetchPosts()
  }

  // Load posts on component mount
  useEffect(() => {
    fetchPosts()
  }, [])

  const handleRefresh = () => {
    refreshPosts()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Comment Generation</h2>
          <p className="text-muted-foreground">
            Generate and approve AI comments for your connections' LinkedIn posts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshPosts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Posts
          </Button>
          <Button variant="outline" onClick={() => window.open('/dashboard/connections', '_self')}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Connections
          </Button>
        </div>
      </div>

      {/* Connection Posts Table with built-in stats */}
      <ConnectionPostsTable
        posts={posts}
        stats={stats}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
    </div>
  )
}