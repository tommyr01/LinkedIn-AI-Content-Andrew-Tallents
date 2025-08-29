'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus, Settings, TrendingUp, Download, Sparkles, Zap, Crown, Target } from 'lucide-react'
import { toast } from "sonner"
import { ConnectionPostsTable, type ConnectionPost, type PostStats } from '@/components/connection-posts-table'

export default function MyPostsPage() {
  const [posts, setPosts] = useState<ConnectionPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [motivationalMessage, setMotivationalMessage] = useState('')
  const [stats, setStats] = useState<PostStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalReactions: 0,
    uniqueConnections: 0,
    averageEngagement: 0
  })

  // Motivational messages for different engagement levels
  const getMotivationalMessage = (stats: PostStats) => {
    const engagementRate = stats.averageEngagement
    const totalEngagement = stats.totalReactions
    
    if (totalEngagement > 1000) {
      return "🚀 You're absolutely crushing it! Your influence is undeniable."
    } else if (totalEngagement > 500) {
      return "🎯 Exceptional engagement levels! Your strategic insights are resonating."
    } else if (totalEngagement > 100) {
      return "🎯 You're building serious engagement! Your audience loves what you share."
    } else if (stats.totalPosts > 0) {
      return "💡 Every post is a step toward thought leadership. You're on the right path!"
    } else {
      return "🌟 Ready to share your brilliance with the world? Let's create something amazing!"
    }
  }

  // Celebration animation trigger (removed confetti)

  // Fetch Andrew's posts from Supabase database
  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      console.log('🔍 Loading Andrew\'s posts from database...')
      
      const response = await fetch('/api/linkedin/posts/list?sortField=posted_at&sortDirection=desc&username=andrewtallents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setPosts(data.posts)
        setStats(data.stats)
        setMotivationalMessage(getMotivationalMessage(data.stats))
        
        // High engagement detected (confetti removed)
        
        console.log(`✅ Loaded ${data.posts.length} posts from database`)
        toast.success(`Loaded ${data.posts.length} posts${data.meta.lastSync ? ` (Last sync: ${new Date(data.meta.lastSync).toLocaleString()})` : ' (No recent sync - click "Refresh from LinkedIn" to get latest)'}`)
      } else {
        throw new Error(data.error || 'Failed to fetch posts')
      }

    } catch (error: any) {
      console.error('Error fetching LinkedIn posts:', error)
      toast.error(`Failed to load posts: ${error.message}`)
      
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


  // Refresh posts data - this will sync Andrew's posts from LinkedIn
  const refreshPosts = async () => {
    setIsLoading(true)
    try {
      console.log('🔄 Refreshing Andrew\'s posts from LinkedIn...')
      toast.info('Fetching latest posts from LinkedIn...')
      
      // Call the sync API to fetch Andrew's posts from RapidAPI
      const syncResponse = await fetch('/api/linkedin/posts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: 'andrewtallents',
          maxPages: 1 // Fetch only page 1 as requested
        })
      })

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Sync failed: HTTP ${syncResponse.status}`)
      }

      const syncData = await syncResponse.json()
      
      if (syncData.success) {
        const summary = syncData.data.summary
        
        // Playful success messages
        if (summary.newPosts > 0) {
          toast.success(`🎉 Fresh content detected! ${summary.newPosts} new posts added to your empire.`)
        } else {
          toast.success(`✨ Everything's up to date! Your content library is perfectly synchronized.`)
        }
        
        // Now fetch the updated data from Supabase
        await fetchPosts()
      } else {
        throw new Error(syncData.error || 'Sync operation failed')
      }

    } catch (error: any) {
      console.error('Error refreshing posts from LinkedIn:', error)
      toast.error(`Failed to refresh posts: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Load posts on component mount
  useEffect(() => {
    fetchPosts()
  }, [])

  const handleRefresh = () => {
    refreshPosts()
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 relative">

      {/* Header with enhanced styling */}
      <div className="relative">
        <div className="flex items-center justify-between space-y-2">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Crown className="h-8 w-8 text-orange-500 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full animate-ping" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent animate-in slide-in-from-left duration-700">
                My LinkedIn Posts
              </h2>
            </div>
            <p className="text-muted-foreground animate-in fade-in slide-in-from-left duration-700 delay-150">
              Your content command center - where executive insights meet engagement analytics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={refreshPosts}
              disabled={isLoading}
              className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <RefreshCw className={`mr-2 h-4 w-4 transition-all duration-300 ${isLoading ? 'animate-spin text-orange-500' : 'group-hover:text-orange-600'}`} />
              {isLoading ? (
                <span className="animate-pulse">Syncing Magic...</span>
              ) : (
                <span className="group-hover:font-medium transition-all">Refresh from LinkedIn</span>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('/dashboard/content', '_self')}
              className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="flex items-center">
                <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300 group-hover:text-orange-600" />
                <Sparkles className="mr-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-300 text-orange-500" />
                <span className="group-hover:font-medium transition-all">Create Content</span>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Executive Dashboard Stats */}
      {stats.totalPosts > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                  <p className="text-2xl font-bold text-blue-600 animate-in zoom-in duration-500">
                    {stats.totalPosts.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Engagement</p>
                  <p className="text-2xl font-bold text-orange-600 animate-in zoom-in duration-500 delay-75">
                    {stats.totalReactions.toLocaleString()}
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-500 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Engagement</p>
                  <p className="text-2xl font-bold text-green-600 animate-in zoom-in duration-500 delay-150">
                    {stats.averageEngagement.toFixed(1)}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-green-500 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Influence Score</p>
                  <p className="text-2xl font-bold text-purple-600 animate-in zoom-in duration-500 delay-200">
                    {Math.min(100, Math.round((stats.totalReactions / Math.max(stats.totalPosts, 1)) * 5)).toLocaleString()}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-purple-500 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Posts Table with built-in stats */}
      <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-400">
        <ConnectionPostsTable
          posts={posts}
          stats={stats}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          showCommentGeneration={false}
        />
      </div>
    </div>
  )
}