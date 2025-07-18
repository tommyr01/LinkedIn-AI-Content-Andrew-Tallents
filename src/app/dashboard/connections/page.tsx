'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { User, UserPlus, Search, Building, Calendar, MessageSquare, TrendingUp, Star } from 'lucide-react'
import { toast } from "sonner"

interface Connection {
  id: string
  name: string
  role: string
  company: string
  linkedinUrl: string
  lastEngagement: string
  engagementScore: number
  tags: string[]
  notes?: string
}

// Mock data for demonstration
const mockConnections: Connection[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'CEO',
    company: 'TechStartup Inc',
    linkedinUrl: 'https://linkedin.com/in/sarahjohnson',
    lastEngagement: '2 days ago',
    engagementScore: 95,
    tags: ['Tech Leader', 'Potential Client', 'Series A'],
    notes: 'Met at tech conference. Interested in leadership coaching.'
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'VP of Sales',
    company: 'Enterprise Corp',
    linkedinUrl: 'https://linkedin.com/in/michaelchen',
    lastEngagement: '1 week ago',
    engagementScore: 82,
    tags: ['Sales Leader', 'Strategic Partner'],
    notes: 'Regular engagement on leadership content'
  },
  {
    id: '3',
    name: 'Jennifer Williams',
    role: 'Founder',
    company: 'Growth Consulting',
    linkedinUrl: 'https://linkedin.com/in/jenniferwilliams',
    lastEngagement: '3 days ago',
    engagementScore: 78,
    tags: ['Entrepreneur', 'Thought Leader'],
    notes: 'Collaborating on joint webinar'
  },
  {
    id: '4',
    name: 'David Martinez',
    role: 'CTO',
    company: 'Innovation Labs',
    linkedinUrl: 'https://linkedin.com/in/davidmartinez',
    lastEngagement: '2 weeks ago',
    engagementScore: 65,
    tags: ['Tech Executive', 'Potential Client'],
    notes: 'Interested in executive coaching program'
  }
]

export default function ConnectionsPage() {
  const [connections, setConnections] = useState(mockConnections)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

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

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Key Connections</h2>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-xs text-muted-foreground">
              Tracked relationships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.filter(c => c.engagementScore >= 80).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Score 80+
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.filter(c => c.lastEngagement.includes('days')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Clients</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.filter(c => c.tags.includes('Potential Client')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Opportunities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={selectedTag === null ? "default" : "outline"}
              onClick={() => setSelectedTag(null)}
            >
              All Tags
            </Button>
            {allTags.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant={selectedTag === tag ? "default" : "outline"}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>
            Manage and track your key LinkedIn relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredConnections.map((connection) => (
              <div key={connection.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{connection.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {connection.role} at {connection.company}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getEngagementColor(connection.engagementScore)}`}>
                      {connection.engagementScore}% engagement
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {connection.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {connection.notes && (
                    <p className="text-sm text-muted-foreground">{connection.notes}</p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Last engagement: {connection.lastEngagement}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        View Activity
                      </Button>
                      <Button size="sm" variant="outline">
                        <Building className="mr-2 h-4 w-4" />
                        View Profile
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
  )
}