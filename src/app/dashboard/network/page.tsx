"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, UserPlus, Search, Building, Calendar, MessageSquare, TrendingUp, Star, RefreshCw, MapPin, Users, ExternalLink, FileText } from 'lucide-react'
import { toast } from "sonner"
import { AddConnectionModal } from '@/components/add-connection-modal'
import { ConnectionPostsTable, type ConnectionPost, type PostStats } from '@/components/connection-posts-table'

interface Connection {
  id: string
  name: string
  role: string
  company: string
  linkedinUrl: string
  profilePictureUrl?: string
  lastEngagement: string
  engagementScore: number
  tags: string[]
  notes?: string
  startDate: string
  followerCount: number
  connectionCount: number
  companyLinkedinUrl: string
  location: string
}

export default function NetworkPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // Connection posts state
  const [connectionPosts, setConnectionPosts] = useState<ConnectionPost[]>([])
  const [postsStats, setPostsStats] = useState<PostStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalReactions: 0,
    uniqueConnections: 0,
    averageEngagement: 0
  })
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [activeTab, setActiveTab] = useState('connections')

  const loadConnections = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      // Use Supabase endpoint instead of Airtable
      const res = await fetch('/api/connections/supabase/list', { cache: 'no-store' })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to load connections')
      }
      const data: Connection[] = await res.json()
      setConnections(data)
      setLastRefresh(new Date())
      console.log(`✅ Loaded ${data.length} connections from Supabase`)
    } catch (e: any) {
      console.error('Error loading connections:', e)
      toast.error(e.message || 'Failed to load connections')
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  const loadConnectionPosts = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoadingPosts(true)
      console.log('🔍 Loading connection posts from Supabase...')
      
      const res = await fetch('/api/connections/posts/list?limit=200', { cache: 'no-store' })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to load connection posts')
      }
      
      const data = await res.json()
      if (data.success) {
        setConnectionPosts(data.posts)
        setPostsStats(data.stats)
        console.log(`✅ Loaded ${data.posts.length} connection posts from Supabase`)
      } else {
        throw new Error(data.error || 'Failed to load connection posts')
      }
    } catch (e: any) {
      console.error('Error loading connection posts:', e)
      toast.error(e.message || 'Failed to load connection posts')
      setConnectionPosts([])
      setPostsStats({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalReactions: 0,
        uniqueConnections: 0,
        averageEngagement: 0
      })
    } finally {
      if (showLoading) setIsLoadingPosts(false)
    }
  }

  const handleRefresh = async () => {
    if (activeTab === 'posts') {
      // Bulk sync posts from all connections
      await handleBulkPostsSync()
    } else {
      // Just refresh connections list
      loadConnections(true)
    }
  }

  const handleBulkPostsSync = async () => {
    try {
      setIsLoadingPosts(true)
      
      toast.info('Starting bulk sync of posts from all connections...')
      console.log('🚀 Starting bulk posts sync...')

      const response = await fetch('/api/connections/posts/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Bulk sync failed')
      }

      const result = await response.json()
      console.log('✅ Bulk sync completed:', result.data)

      if (result.success) {
        const { processed, newPosts, errors, skipped } = result.data
        
        // Show detailed success message
        if (newPosts > 0) {
          toast.success(`Successfully synced ${newPosts} new posts from ${processed} connections!`)
        } else if (processed > 0) {
          toast.info(`Checked ${processed} connections - no new posts found`)
        } else {
          toast.info(`All ${skipped} connections were recently synced - no sync needed`)
        }

        if (errors > 0) {
          toast.warning(`Note: ${errors} connections had sync errors`)
        }

        // Refresh the posts table to show new data
        await loadConnectionPosts(false)
        
      } else {
        throw new Error(result.error || 'Unknown error')
      }

    } catch (error: any) {
      console.error('💥 Bulk sync error:', error)
      toast.error(`Bulk sync failed: ${error.message}`)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [])

  // Load posts when posts tab is activated
  useEffect(() => {
    if (activeTab === 'posts' && connectionPosts.length === 0) {
      loadConnectionPosts()
    }
  }, [activeTab])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConnections(false) // Don't show loading for auto-refresh
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Refresh when page regains focus
  useEffect(() => {
    const handleFocus = () => loadConnections(false)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const filteredConnections = connections.filter(connection => {
    const matchesSearch = connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = !selectedTag || connection.tags.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  const allTags = Array.from(new Set(connections.flatMap(c => c.tags)))

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const calculateDuration = (startDate: string) => {
    if (!startDate) return 'Unknown'
    
    try {
      const start = new Date(startDate)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 30) {
        return `${diffDays} days`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months} month${months > 1 ? 's' : ''}`
      } else {
        const years = Math.floor(diffDays / 365)
        const remainingMonths = Math.floor((diffDays % 365) / 30)
        if (remainingMonths === 0) {
          return `${years} year${years > 1 ? 's' : ''}`
        }
        return `${years}y ${remainingMonths}m`
      }
    } catch (error) {
      return 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <AddConnectionModal open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) loadConnections() }} />
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">LinkedIn Network</h2>
          {lastRefresh && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isLoading || isLoadingPosts}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(isLoading || isLoadingPosts) ? 'animate-spin' : ''}`} />
            {(isLoading || isLoadingPosts) 
              ? (activeTab === 'posts' ? 'Syncing Posts...' : 'Refreshing...') 
              : (activeTab === 'posts' ? 'Sync New Posts' : 'Refresh')
            }
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Connection
          </Button>
        </div>
      </div>

      <Tabs defaultValue="connections" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="connections">
            <Users className="mr-2 h-4 w-4" />
            Connections ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="posts">
            <FileText className="mr-2 h-4 w-4" />
            Their Posts ({postsStats.totalPosts})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-xs text-muted-foreground">Tracked relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.filter(c => c.engagementScore >= 80).length}</div>
            <p className="text-xs text-muted-foreground">Score 80+</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.filter(c => c.lastEngagement?.includes('day')).length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Clients</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.filter(c => c.tags.includes('Potential Client')).length}</div>
            <p className="text-xs text-muted-foreground">Opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, company, or role..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={selectedTag === null ? 'default' : 'outline'} onClick={() => setSelectedTag(null)}>All Tags</Button>
            {allTags.map(tag => (
              <Button key={tag} size="sm" variant={selectedTag === tag ? 'default' : 'outline'} onClick={() => setSelectedTag(tag)}>{tag}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>Manage and track your key LinkedIn relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredConnections.map(connection => (
              <div key={connection.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {connection.profilePictureUrl ? (
                    <img 
                      src={connection.profilePictureUrl} 
                      alt={connection.name}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{connection.name}</p>
                      <p className="text-sm text-muted-foreground">{connection.role} at {connection.company}</p>
                      {connection.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{connection.location}</span>
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getEngagementColor(connection.engagementScore)}`}>{connection.engagementScore}% engagement</div>
                  </div>

                  {/* Company tenure and follower info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Started: {formatDate(connection.startDate)}</p>
                      <p className="font-medium">Duration: {calculateDuration(connection.startDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{formatNumber(connection.followerCount)} followers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{formatNumber(connection.connectionCount)} connections</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {connection.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                  
                  {connection.notes && <p className="text-sm text-muted-foreground">{connection.notes}</p>}
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Last engagement: {connection.lastEngagement}</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline"><MessageSquare className="mr-2 h-4 w-4" />View Activity</Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={connection.linkedinUrl} target="_blank" rel="noreferrer">
                          <User className="mr-2 h-4 w-4" />Profile
                        </a>
                      </Button>
                      {connection.companyLinkedinUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={connection.companyLinkedinUrl} target="_blank" rel="noreferrer">
                            <Building className="mr-2 h-4 w-4" />Company
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {/* Posts Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{postsStats.totalPosts}</div>
                <p className="text-xs text-muted-foreground">From all connections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{postsStats.totalReactions}</div>
                <p className="text-xs text-muted-foreground">Across all posts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{postsStats.uniqueConnections}</div>
                <p className="text-xs text-muted-foreground">Posted content</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{postsStats.averageEngagement}</div>
                <p className="text-xs text-muted-foreground">Per post</p>
              </CardContent>
            </Card>
          </div>

          {/* Connection Posts Table */}
          <ConnectionPostsTable 
            posts={connectionPosts} 
            stats={postsStats}
            onRefresh={() => loadConnectionPosts(true)}
            isLoading={isLoadingPosts}
            showCommentGeneration={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
