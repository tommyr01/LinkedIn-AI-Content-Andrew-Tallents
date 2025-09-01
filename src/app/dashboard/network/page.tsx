"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
// Removed Tabs components - using custom implementation
import { User, UserPlus, Search, Building, Calendar, MessageSquare, TrendingUp, Star, RefreshCw, MapPin, Users, ExternalLink, FileText, Trash2 } from 'lucide-react'
import { toast } from "sonner"
import { AddConnectionModal } from '@/components/add-connection-modal'
import { ConnectionPostsTable, type ConnectionPost, type PostStats } from '@/components/connection-posts-table'
import { ResearchButton } from '@/components/lead-research-sheet'

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
      
      const res = await fetch('/api/connections/posts/list?limit=500', { cache: 'no-store' })
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

  const handleDeleteConnection = async (connectionId: string, connectionName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${connectionName}? This will also remove all their posts and cannot be undone.`)) {
      return
    }

    try {
      console.log(`🗑️ Deleting connection: ${connectionName} (${connectionId})`)
      
      const response = await fetch(`/api/connections/delete?id=${connectionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete connection')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success(`Successfully deleted ${connectionName} and all their posts`)
        
        // Refresh both connections and posts
        loadConnections()
        if (activeTab === 'posts') {
          loadConnectionPosts()
        }
      } else {
        throw new Error(result.error || 'Delete failed')
      }

    } catch (error: any) {
      console.error('❌ Delete connection error:', error)
      toast.error(`Failed to delete connection: ${error.message}`)
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
    if (score >= 80) return 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
    if (score >= 60) return 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
    return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
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
    <div className="flex-1 space-y-6 min-h-screen bg-gradient-to-br from-background via-card to-background">
      <AddConnectionModal open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) loadConnections() }} />
      
      {/* Header Section with distinct background */}
      <div className="bg-gradient-to-r from-card/80 via-muted/60 to-card/80 backdrop-blur-sm border-b border-border/50 p-8 pt-6 rounded-b-2xl shadow-2xl shadow-background/50">
        <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Strategic Network Intelligence</h2>
          {lastRefresh && (
            <p className="text-sm text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/50">
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
              className="bg-muted/60 border-border/50 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
            >
            <RefreshCw className={`mr-2 h-4 w-4 ${(isLoading || isLoadingPosts) ? 'animate-spin' : ''}`} />
            {(isLoading || isLoadingPosts) 
              ? (activeTab === 'posts' ? 'Syncing Posts...' : 'Refreshing...') 
              : (activeTab === 'posts' ? 'Sync New Posts' : 'Refresh')
            }
          </Button>
            <Button 
              onClick={() => setAddOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl hover:shadow-orange-500/25 transition-all duration-200 hover:transform hover:scale-105"
            >
            <UserPlus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content with layered backgrounds */}
      <div className="px-8 pb-8 space-y-8">

        {/* Tab Navigation with enhanced background */}
        <div className="bg-gradient-to-r from-card/80 via-muted/60 to-card/80 backdrop-blur-md rounded-2xl p-1.5 border border-border/50 inline-flex items-center gap-1.5 shadow-xl shadow-background/30">
          <button
            onClick={() => setActiveTab('connections')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
              activeTab === 'connections'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 transform scale-105 border border-orange-400/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-orange-500/20 hover:to-amber-500/20 border border-transparent hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/10'
            }`}
          >
            <Users className={`mr-2 h-4 w-4 ${activeTab === 'connections' ? 'text-white' : ''}`} />
            Strategic Connections ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
              activeTab === 'posts'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 transform scale-105 border border-orange-400/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-orange-500/20 hover:to-amber-500/20 border border-transparent hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/10'
            }`}
          >
            <FileText className={`mr-2 h-4 w-4 ${activeTab === 'posts' ? 'text-white' : ''}`} />
            Intelligence Feed ({postsStats.totalPosts})
          </button>
        </div>

        <div className={`space-y-8 ${activeTab === 'connections' ? 'block' : 'hidden'}`}>

        {/* Connections Section with distinct background */}
        <div className="bg-gradient-to-b from-card/40 to-muted/60 rounded-3xl p-8 border border-border/50 shadow-2xl shadow-background/40">
          {/* Enhanced Stats Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-500/15 via-blue-600/10 to-card/60 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Connections</CardTitle>
            <div className="p-2 bg-blue-500/15 rounded-lg">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{connections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tracked relationships</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/15 via-green-600/10 to-card/60 border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">High Engagement</CardTitle>
            <div className="p-2 bg-green-500/15 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{connections.filter(c => c.engagementScore >= 80).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Score 80+</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/15 via-purple-600/10 to-card/60 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Recent Activity</CardTitle>
            <div className="p-2 bg-purple-500/15 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{connections.filter(c => c.lastEngagement?.includes('day')).length}</div>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-card/60 border-amber-500/30 hover:border-orange-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Potential Clients</CardTitle>
            <div className="p-2 bg-amber-500/15 rounded-lg">
              <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{connections.filter(c => c.tags.includes('Potential Client')).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Opportunities</p>
          </CardContent>
        </Card>
          </div>

          {/* Enhanced Search & Filters with layered background */}
          <Card className="bg-gradient-to-br from-muted/60 via-card/40 to-muted/80 border-border/50 backdrop-blur-md shadow-xl shadow-background/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Search className="h-5 w-5 text-orange-500" />
            Search and Filter
          </CardTitle>
          <CardDescription className="text-muted-foreground">Find and organise your strategic LinkedIn intelligence network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search strategic connections by name, company, or role..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-10 bg-muted/60 border-border/50 focus:border-orange-500/70 focus:ring-orange-500/30 transition-all duration-200 hover:bg-muted/80 focus:bg-muted/90" 
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant={selectedTag === null ? 'default' : 'outline'} 
              onClick={() => setSelectedTag(null)}
              className={selectedTag === null ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-muted/60 border-border/50 hover:bg-orange-500/20 hover:border-orange-500/40 hover:text-orange-400 transition-all duration-200'}
            >
              All Tags
            </Button>
            {allTags.map(tag => (
              <Button 
                key={tag} 
                size="sm" 
                variant={selectedTag === tag ? 'default' : 'outline'} 
                onClick={() => setSelectedTag(tag)}
                className={selectedTag === tag ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-muted/60 border-border/50 hover:bg-orange-500/20 hover:border-orange-500/40 hover:text-orange-400 transition-all duration-200'}
              >
                {tag}
              </Button>
            ))}
          </div>
        </CardContent>
          </Card>

          {/* Enhanced Connections List with distinct background */}
          <Card className="bg-gradient-to-br from-card/50 via-muted/30 to-card/70 border-border/50 backdrop-blur-md shadow-xl shadow-background/40">
        <CardHeader>
          <CardTitle className="text-foreground">Strategic Network</CardTitle>
          <CardDescription className="text-muted-foreground">Manage and track your executive LinkedIn intelligence network relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredConnections.map(connection => (
              <div key={connection.id} className="group flex items-start space-x-4 p-6 border border-border/50 rounded-xl bg-gradient-to-r from-muted/60 via-card/40 to-muted/60 hover:border-orange-500/40 hover:bg-gradient-to-r hover:from-orange-500/10 hover:via-amber-500/5 hover:to-orange-500/10 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 hover:transform hover:scale-[1.02] backdrop-blur-sm">
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
                    <div className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${getEngagementColor(connection.engagementScore)}`}>
                      {connection.engagementScore}% engagement
                    </div>
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
                    {connection.tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 hover:bg-orange-500/20 transition-colors duration-200"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {connection.notes && <p className="text-sm text-muted-foreground">{connection.notes}</p>}
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Last engagement: {connection.lastEngagement}</span>
                    <div className="flex items-center gap-2">
                      <ResearchButton 
                        profileUrl={connection.linkedinUrl} 
                        size="sm" 
                        variant="outline"
                        onLeadCreated={(lead) => {
                          toast.success(`Research completed for ${lead.name} - ICP Score: ${lead.icpScore}/100`)
                        }}
                      />
                      <Button size="sm" variant="outline" className="bg-muted/60 border-border/50 hover:bg-orange-500/20 hover:border-orange-500/40 hover:text-orange-400 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/20 executive-card">
                        <MessageSquare className="mr-2 h-4 w-4" />Strategic Intelligence
                      </Button>
                      <Button size="sm" variant="outline" asChild className="bg-muted/60 border-border/50 hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-400 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20">
                        <a href={connection.linkedinUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />Executive Profile
                        </a>
                      </Button>
                      {connection.companyLinkedinUrl && (
                        <Button size="sm" variant="outline" asChild className="bg-muted/60 border-border/50 hover:bg-green-500/20 hover:border-green-500/40 hover:text-green-400 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20">
                          <a href={connection.companyLinkedinUrl} target="_blank" rel="noreferrer">
                            <Building className="mr-2 h-4 w-4" />Company
                          </a>
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteConnection(connection.id, connection.name)}
                        className="bg-muted/60 border-border/50 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20">
                      >
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
          </Card>
        </div>
        </div>

        <div className={`space-y-8 ${activeTab === 'posts' ? 'block' : 'hidden'}`}>
        
        {/* Posts Section with distinct background */}
        <div className="bg-gradient-to-b from-muted/50 to-card/70 rounded-3xl p-8 border border-border/50 shadow-2xl shadow-background/40">
          {/* Enhanced Posts Stats */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card className="bg-gradient-to-br from-cyan-500/15 via-cyan-600/10 to-card/60 border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Total Posts</CardTitle>
                <div className="p-2 bg-cyan-500/15 rounded-lg">
                  <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{postsStats.totalPosts}</div>
                <p className="text-xs text-muted-foreground mt-1">From all connections</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500/15 via-pink-600/10 to-card/60 border-pink-500/30 hover:border-pink-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-pink-600 dark:text-pink-400">Total Reactions</CardTitle>
                <div className="p-2 bg-pink-500/15 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{postsStats.totalReactions}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all posts</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-card/60 border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active Connections</CardTitle>
                <div className="p-2 bg-emerald-500/15 rounded-lg">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{postsStats.uniqueConnections}</div>
                <p className="text-xs text-muted-foreground mt-1">Posted content</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/15 via-violet-600/10 to-card/60 border-violet-500/30 hover:border-violet-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/20 hover:transform hover:scale-105 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-violet-600 dark:text-violet-400">Avg Engagement</CardTitle>
                <div className="p-2 bg-violet-500/15 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{postsStats.averageEngagement}</div>
                <p className="text-xs text-muted-foreground mt-1">Per post</p>
              </CardContent>
            </Card>
          </div>

          {/* Connection Posts Table with enhanced background */}
          <div className="bg-gradient-to-br from-card/40 via-muted/20 to-card/60 rounded-2xl p-6 border border-border/30 shadow-lg shadow-background/30">
            <ConnectionPostsTable 
              posts={connectionPosts} 
              stats={postsStats}
              onRefresh={() => loadConnectionPosts(true)}
              isLoading={isLoadingPosts}
              showCommentGeneration={true}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
