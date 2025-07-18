'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Clock, FileText } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns'

interface ScheduledPost {
  id: string
  fields: {
    Content: string
    'Scheduled Date': string
    Status: string
    'Post Type': string
  }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheduledPosts()
  }, [])

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch('/api/airtable/posts?scheduled=true')
      if (response.ok) {
        const posts = await response.json()
        setScheduledPosts(posts.filter((post: ScheduledPost) => post.fields['Scheduled Date']))
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter(post => {
      const postDate = parseISO(post.fields['Scheduled Date'])
      return isSameDay(postDate, date)
    })
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Content Calendar</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(new Date())}
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading scheduled posts...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month start */}
              {Array.from({ length: startDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}
              
              {/* Calendar days */}
              {monthDays.map((day) => {
                const posts = getPostsForDate(day)
                const isToday = isSameDay(day, new Date())
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      aspect-square border rounded-lg p-2 
                      ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      ${posts.length > 0 ? 'bg-green-50' : ''}
                    `}
                  >
                    <div className="text-sm font-medium">{format(day, 'd')}</div>
                    {posts.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {posts.slice(0, 2).map((post, index) => (
                          <div
                            key={post.id}
                            className="text-xs bg-green-200 text-green-800 rounded px-1 py-0.5 truncate"
                            title={post.fields.Content}
                          >
                            <Clock className="inline h-3 w-3 mr-1" />
                            {post.fields['Post Type'] || 'Post'}
                          </div>
                        ))}
                        {posts.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{posts.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Scheduled Posts</CardTitle>
          <CardDescription>
            Posts scheduled for the next 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : scheduledPosts.length === 0 ? (
            <p className="text-muted-foreground">No scheduled posts</p>
          ) : (
            <div className="space-y-4">
              {scheduledPosts
                .filter(post => {
                  const postDate = parseISO(post.fields['Scheduled Date'])
                  const now = new Date()
                  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                  return postDate >= now && postDate <= weekFromNow
                })
                .sort((a, b) => 
                  parseISO(a.fields['Scheduled Date']).getTime() - 
                  parseISO(b.fields['Scheduled Date']).getTime()
                )
                .map((post) => (
                  <div key={post.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium line-clamp-2">
                        {post.fields.Content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(parseISO(post.fields['Scheduled Date']), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {post.fields['Post Type'] || 'Post'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}