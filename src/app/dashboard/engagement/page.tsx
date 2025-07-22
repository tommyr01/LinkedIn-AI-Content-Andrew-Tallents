'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus, Settings } from 'lucide-react'
import { toast } from "sonner"
import { InfluencerPostsTable, type InfluencerPost } from '@/components/influencer-posts-table'

export default function EngagementPage() {
  const [posts, setPosts] = useState<InfluencerPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEngagements: 0,
    commentsPosted: 0,
    connectionsTracked: 0
  })

  // Fetch influencer posts from Airtable
  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, you'd have an API endpoint that fetches from Airtable
      // For now, we'll create a mock fetch that simulates the real data structure
      
      // This would be: const response = await fetch('/api/influencers/posts')
      // But since we haven't created that endpoint yet, we'll simulate it
      
      const mockInfluencerPosts: InfluencerPost[] = [
        {
          id: 'rec1234567890',
          influencerName: 'Sarah Johnson',
          influencerCompany: 'TechStartup Inc',
          content: 'Just closed our Series A funding! Excited to announce we raised $10M to expand our AI-powered analytics platform. The journey has been incredible - from a team of 3 to 25 amazing people who believe in our vision of making data accessible to everyone.\n\nSpecial thanks to our investors, advisors, and early customers who took a chance on us. This is just the beginning! 🚀\n\n#SeriesA #AI #DataAnalytics #StartupLife',
          postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          linkedinPostId: 'activity-7123456789',
          likesCount: 245,
          commentsCount: 32,
          engagementStatus: 'Not Engaged',
          scrapedAt: new Date().toISOString(),
          postUrl: 'https://linkedin.com/posts/sarah-johnson_seriesa-ai-dataanalytics-activity-7123456789'
        },
        {
          id: 'rec1234567891',
          influencerName: 'Michael Chen',
          influencerCompany: 'Enterprise Corp',
          content: 'Leadership tip for the week: The best way to predict the future is to create it.\n\nI\'ve been reflecting on this quote by Peter Drucker lately. In my 15 years leading sales teams, I\'ve seen that the most successful leaders don\'t wait for opportunities - they create them.\n\nThree ways to "create your future":\n1. Set bold, specific goals (not just "grow revenue")\n2. Take calculated risks daily\n3. Invest in your team\'s growth\n\nWhat are you creating today? 💪\n\n#Leadership #SalesLeadership #Growth #Mindset',
          postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          linkedinPostId: 'activity-7123456790',
          likesCount: 189,
          commentsCount: 27,
          engagementStatus: 'Commented',
          scrapedAt: new Date().toISOString(),
          postUrl: 'https://linkedin.com/posts/michael-chen_leadership-salesleadership-growth-activity-7123456790'
        },
        {
          id: 'rec1234567892',
          influencerName: 'Jennifer Williams',
          influencerCompany: 'Growth Consulting',
          content: 'After working with 50+ scaling companies, here are the THREE keys to sustainable growth:\n\n🎯 1. Focus on customer SUCCESS, not just acquisition\n→ It costs 5x more to acquire than retain\n→ Happy customers become your best salespeople\n→ Churn kills growth faster than slow acquisition\n\n⚙️ 2. Build SYSTEMS, not just solutions\n→ Document processes before you need them\n→ Automate repetitive tasks early\n→ Create workflows that work without you\n\n👥 3. Invest in your TEAM\'s growth\n→ Your people are your competitive advantage\n→ Skills gaps compound over time\n→ Culture scales, tactics don\'t\n\nWhat would you add to this list? I\'d love to hear your thoughts! 👇\n\n#ScaleUp #BusinessGrowth #Leadership #Systems #CustomerSuccess',
          postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          linkedinPostId: 'activity-7123456791',
          likesCount: 567,
          commentsCount: 89,
          engagementStatus: 'Not Engaged',
          scrapedAt: new Date().toISOString(),
          postUrl: 'https://linkedin.com/posts/jennifer-williams_scaleup-businessgrowth-leadership-activity-7123456791'
        },
        {
          id: 'rec1234567893',
          influencerName: 'David Rodriguez',
          influencerCompany: 'Innovation Labs',
          content: 'Unpopular opinion: Most "AI transformations" fail because companies focus on the technology, not the transformation.\n\nI\'ve seen this pattern dozens of times:\n❌ Company buys AI tools\n❌ Expects immediate ROI\n❌ Doesn\'t change processes\n❌ Ignores change management\n❌ Wonders why it didn\'t work\n\nSuccessful AI adoption looks different:\n✅ Start with the problem, not the tool\n✅ Redesign workflows around AI capabilities\n✅ Train people on new ways of working\n✅ Measure impact, not just usage\n✅ Iterate based on real results\n\nAI is a multiplier, not magic. It amplifies what you already do well (and poorly).\n\nWhat\'s your experience been with AI implementation?\n\n#AI #DigitalTransformation #ChangeManagement #Innovation #Leadership',
          postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
          linkedinPostId: 'activity-7123456792',
          likesCount: 123,
          commentsCount: 45,
          engagementStatus: 'Liked',
          scrapedAt: new Date().toISOString(),
          postUrl: 'https://linkedin.com/posts/david-rodriguez_ai-digitaltransformation-changemanagement-activity-7123456792'
        }
      ]
      
      setPosts(mockInfluencerPosts)

      // Update stats based on posts
      setStats({
        totalEngagements: mockInfluencerPosts.filter(p => p.engagementStatus !== 'Not Engaged').length,
        commentsPosted: mockInfluencerPosts.filter(p => p.engagementStatus === 'Commented').length,
        connectionsTracked: new Set(mockInfluencerPosts.map(p => p.influencerName)).size
      })
      
      toast.success(`Loaded ${mockInfluencerPosts.length} recent posts`)

    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load influencer posts')
    } finally {
      setIsLoading(false)
    }
  }

  // Trigger influencer post scraping
  const triggerScraping = async () => {
    try {
      const response = await fetch('/api/influencers/webhook', {
        method: 'GET'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Scraping started for ${result.influencerCount} influencers`)
        
        // Refresh posts after a delay to show new results
        setTimeout(() => {
          fetchPosts()
        }, 5000)
      } else {
        toast.error('Failed to trigger scraping')
      }
    } catch (error) {
      console.error('Error triggering scraping:', error)
      toast.error('Error starting scraping process')
    }
  }

  // Load posts on component mount
  useEffect(() => {
    fetchPosts()
  }, [])

  const handleRefresh = () => {
    fetchPosts()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Engagement Hub</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={triggerScraping}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Scrape Posts
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Manage Influencers
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEngagements}</div>
            <p className="text-xs text-muted-foreground">
              Posts engaged with
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments Posted</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.commentsPosted}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Influencers Tracked</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connectionsTracked}</div>
            <p className="text-xs text-muted-foreground">
              Active influencers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Influencer Posts Table */}
      <InfluencerPostsTable
        posts={posts}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
    </div>
  )
}