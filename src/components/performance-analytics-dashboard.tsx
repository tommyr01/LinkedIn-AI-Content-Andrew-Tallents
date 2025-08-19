"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Heart, 
  Share2, 
  BarChart3, 
  Calendar,
  Trophy,
  Target,
  Brain,
  Zap,
  Eye,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle
} from "lucide-react"

interface PerformanceMetric {
  label: string
  value: string | number
  change: number
  changeLabel: string
  icon: React.ComponentType<{ className?: string }>
  trend: 'up' | 'down' | 'stable'
  color: string
}

interface ContentInsight {
  title: string
  description: string
  recommendation: string
  impact: 'high' | 'medium' | 'low'
  category: 'voice' | 'engagement' | 'timing' | 'format'
}

const MOCK_METRICS: PerformanceMetric[] = [
  {
    label: 'Avg. Engagement Rate',
    value: '4.2%',
    change: 0.8,
    changeLabel: '+0.8% vs last month',
    icon: TrendingUp,
    trend: 'up',
    color: 'text-green-600'
  },
  {
    label: 'Voice Consistency',
    value: '87%',
    change: 5,
    changeLabel: '+5% improvement',
    icon: Brain,
    trend: 'up',
    color: 'text-blue-600'
  },
  {
    label: 'Comments per Post',
    value: '23',
    change: 3,
    changeLabel: '+3 avg comments',
    icon: MessageCircle,
    trend: 'up',
    color: 'text-purple-600'
  },
  {
    label: 'Profile Views',
    value: '1.2K',
    change: -2,
    changeLabel: '-2% this week',
    icon: Eye,
    trend: 'down',
    color: 'text-amber-600'
  }
]

const MOCK_INSIGHTS: ContentInsight[] = [
  {
    title: 'Leadership Posts Drive 40% More Engagement',
    description: 'Content focused on leadership insights consistently outperforms other topics',
    recommendation: 'Increase leadership-focused content to 3x per week',
    impact: 'high',
    category: 'engagement'
  },
  {
    title: 'Tuesday Morning Posts Perform Best',
    description: 'Posts published between 8-10 AM on Tuesdays show 25% higher engagement',
    recommendation: 'Schedule key content for Tuesday mornings',
    impact: 'medium',
    category: 'timing'
  },
  {
    title: 'Personal Stories Boost Voice Authenticity',
    description: 'Posts with personal anecdotes score 12% higher on voice consistency',
    recommendation: 'Include more personal experiences in thought leadership',
    impact: 'medium',
    category: 'voice'
  },
  {
    title: 'Question-ending Posts Generate 50% More Comments',
    description: 'Posts that end with questions see significantly more discussion',
    recommendation: 'Always include an engaging question in posts',
    impact: 'high',
    category: 'format'
  }
]

export function PerformanceAnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'voice': return Brain
      case 'engagement': return MessageCircle
      case 'timing': return Clock
      case 'format': return BarChart3
      default: return Target
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'voice': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'engagement': return 'text-green-600 bg-green-50 border-green-200'
      case 'timing': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'format': return 'text-amber-600 bg-amber-50 border-amber-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Track content performance and optimize Andrew's strategic approach
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Export Report
          </Button>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Real-time Tracking
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="voice-evolution">Voice Evolution</TabsTrigger>
          <TabsTrigger value="content-insights">Content Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_METRICS.map((metric, index) => {
              const Icon = metric.icon
              const TrendIcon = metric.trend === 'up' ? ArrowUp : metric.trend === 'down' ? ArrowDown : null
              
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <p className={`text-xs flex items-center gap-1 ${metric.color}`}>
                      {TrendIcon && <TrendIcon className="h-3 w-3" />}
                      {metric.changeLabel}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Performance Trends */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Engagement Trends
                </CardTitle>
                <CardDescription>Performance over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Likes</span>
                      <span className="text-green-600">↑ 15%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Comments</span>
                      <span className="text-green-600">↑ 22%</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Shares</span>
                      <span className="text-blue-600">↑ 8%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Profile Views</span>
                      <span className="text-red-600">↓ 2%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Performing Content
                </CardTitle>
                <CardDescription>Best posts from the last month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Leadership in Crisis Management</p>
                      <p className="text-xs text-muted-foreground mt-1">3 days ago</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">156 engagements</p>
                      <p className="text-xs text-muted-foreground">5.2% rate</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Building High-Performance Teams</p>
                      <p className="text-xs text-muted-foreground mt-1">1 week ago</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">142 engagements</p>
                      <p className="text-xs text-muted-foreground">4.8% rate</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Lessons from 20 Years in Tech</p>
                      <p className="text-xs text-muted-foreground mt-1">2 weeks ago</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-600">128 engagements</p>
                      <p className="text-xs text-muted-foreground">4.3% rate</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="voice-evolution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Voice Consistency Evolution
              </CardTitle>
              <CardDescription>
                Track how well generated content matches Andrew's authentic voice over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border">
                    <div className="text-4xl font-bold text-blue-600 mb-2">87%</div>
                    <p className="text-sm text-muted-foreground">Current Voice Match Score</p>
                    <div className="flex items-center justify-center gap-1 mt-2 text-green-600 text-sm">
                      <ArrowUp className="h-3 w-3" />
                      +5% improvement this month
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tone Consistency</span>
                      <div className="flex items-center gap-2">
                        <Progress value={92} className="w-20 h-2" />
                        <span className="text-sm font-medium">92%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Vocabulary Match</span>
                      <div className="flex items-center gap-2">
                        <Progress value={85} className="w-20 h-2" />
                        <span className="text-sm font-medium">85%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Style Authenticity</span>
                      <div className="flex items-center gap-2">
                        <Progress value={84} className="w-20 h-2" />
                        <span className="text-sm font-medium">84%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Voice Learning Insights</h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Strong Pattern</span>
                      </div>
                      <p className="text-xs text-green-700">
                        Personal anecdotes consistently score 90%+ voice match
                      </p>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Improving</span>
                      </div>
                      <p className="text-xs text-yellow-700">
                        Technical explanations now match Andrew's style better
                      </p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Learning</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        AI is adapting to Andrew's evolving communication style
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-insights" className="space-y-6">
          <div className="grid gap-4">
            {MOCK_INSIGHTS.map((insight, index) => {
              const CategoryIcon = getCategoryIcon(insight.category)
              const categoryColor = getCategoryColor(insight.category)
              const impactColor = getImpactColor(insight.impact)
              
              return (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${categoryColor}`}>
                          <CategoryIcon className={`h-4 w-4 ${categoryColor.split(' ')[0]}`} />
                        </div>
                        <span className="text-lg">{insight.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={impactColor}>
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        <Badge variant="outline" className={categoryColor}>
                          {insight.category.toUpperCase()}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Analysis</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Recommended Action</h4>
                        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                          {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Performance Predictions
              </CardTitle>
              <CardDescription>
                Intelligent forecasts based on historical data and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>AI prediction models are training on Andrew's content patterns.</p>
                <p className="text-sm mt-2">Advanced performance forecasting coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}