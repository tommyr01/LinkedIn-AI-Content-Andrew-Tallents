'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Eye, Heart, MessageSquare, Users, Calendar, BarChart, LineChart } from 'lucide-react'
import { Line, LineChart as RechartsLineChart, Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data for charts
const engagementData = [
  { day: 'Mon', views: 245, likes: 45, comments: 12 },
  { day: 'Tue', views: 312, likes: 67, comments: 18 },
  { day: 'Wed', views: 278, likes: 52, comments: 15 },
  { day: 'Thu', views: 389, likes: 78, comments: 23 },
  { day: 'Fri', views: 456, likes: 89, comments: 28 },
  { day: 'Sat', views: 234, likes: 43, comments: 9 },
  { day: 'Sun', views: 198, likes: 38, comments: 7 },
]

const postTypeData = [
  { type: 'Thought Leadership', posts: 12, avgEngagement: 234 },
  { type: 'Tips', posts: 8, avgEngagement: 189 },
  { type: 'Story', posts: 15, avgEngagement: 312 },
  { type: 'Question', posts: 6, avgEngagement: 456 },
  { type: 'Announcement', posts: 4, avgEngagement: 167 },
]

const topPosts = [
  {
    id: '1',
    content: '3 Leadership lessons I learned from failing my first startup...',
    date: 'Dec 15, 2024',
    views: 4567,
    likes: 234,
    comments: 45,
    engagement: 5.8,
  },
  {
    id: '2',
    content: 'The one question every CEO should ask their team weekly...',
    date: 'Dec 10, 2024',
    views: 3890,
    likes: 189,
    comments: 38,
    engagement: 5.3,
  },
  {
    id: '3',
    content: 'Why emotional intelligence matters more than IQ in leadership...',
    date: 'Dec 5, 2024',
    views: 3234,
    likes: 167,
    comments: 29,
    engagement: 4.9,
  },
]

export default function AnalyticsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Last 30 days</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,567</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">287</div>
            <p className="text-xs text-muted-foreground">
              +15.7% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.4%</div>
            <p className="text-xs text-muted-foreground">
              +0.8% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
          <CardDescription>
            Daily views, likes, and comments for the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <RechartsLineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Views"
              />
              <Line 
                type="monotone" 
                dataKey="likes" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Likes"
              />
              <Line 
                type="monotone" 
                dataKey="comments" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Comments"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Post Type Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Post Type</CardTitle>
            <CardDescription>
              Average engagement by content category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={postTypeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="type" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="avgEngagement" fill="#3b82f6" name="Avg Engagement" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>
              Your best content from the past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPosts.map((post) => (
                <div key={post.id} className="space-y-2">
                  <p className="text-sm font-medium line-clamp-2">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments}
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>
            AI-generated recommendations based on your analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
            <div>
              <p className="text-sm font-medium">Question posts drive 2.4x more engagement</p>
              <p className="text-xs text-muted-foreground">
                Your question-based posts receive significantly more comments and shares
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
            <div>
              <p className="text-sm font-medium">Thursday and Friday are your best posting days</p>
              <p className="text-xs text-muted-foreground">
                Engagement peaks on these days, with 45% higher views on average
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5" />
            <div>
              <p className="text-sm font-medium">Story-based content creates deeper connections</p>
              <p className="text-xs text-muted-foreground">
                Personal stories receive 3x more meaningful comments and DMs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}