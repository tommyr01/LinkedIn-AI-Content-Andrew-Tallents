"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, User, Building, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface AddConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnectionCreated?: () => void
}

interface LinkedInData {
  fullname: string
  headline: string
  about: string
  location: { full: string }
  follower_count: number
  connection_count: number
  current_company: string
  profile_picture_url: string
  is_creator: boolean
  is_influencer: boolean
  is_premium: boolean
}

export function AddConnectionModal({ open, onOpenChange, onConnectionCreated }: AddConnectionModalProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [linkedinUsername, setLinkedinUsername] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichedData, setEnrichedData] = useState<LinkedInData | null>(null)
  const [useLinkedInData, setUseLinkedInData] = useState(false)

  const handleEnrichFromLinkedIn = async () => {
    if (!linkedinUsername.trim()) {
      toast.error('LinkedIn username is required')
      return
    }

    setIsEnriching(true)
    try {
      const res = await fetch('/api/connections/enrich-from-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: linkedinUsername,
          createRecord: false // Just get the data, don't create yet
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch LinkedIn data')
      }
      
      const data = await res.json()
      setEnrichedData(data.linkedinData)
      setUseLinkedInData(true)
      
      // Auto-fill the form with LinkedIn data
      setName(data.linkedinData.fullname)
      setUrl(`https://linkedin.com/in/${linkedinUsername}`)
      
      toast.success('LinkedIn profile data loaded successfully!')
    } catch (error: any) {
      console.error('Error enriching from LinkedIn:', error)
      toast.error(error.message || 'Failed to fetch LinkedIn data')
    } finally {
      setIsEnriching(false)
    }
  }

  const handleSave = async () => {
    if (useLinkedInData && enrichedData) {
      // Save using LinkedIn enriched data
      setIsSaving(true)
      try {
        const res = await fetch('/api/connections/enrich-from-linkedin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: linkedinUsername,
            createRecord: true // Create the full enriched record
          })
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to create connection')
        }
        
        toast.success('Connection added with LinkedIn data!')
        onConnectionCreated?.()
        handleReset()
        onOpenChange(false)
      } catch (error: any) {
        console.error('Error saving LinkedIn connection:', error)
        toast.error(error.message || 'Error adding connection')
      } finally {
        setIsSaving(false)
      }
    } else {
      // Save using manual data (existing functionality)
      if (!name.trim() || !url.trim()) {
        toast.error('Name and LinkedIn URL are required')
        return
      }
      setIsSaving(true)
      try {
        const res = await fetch('/api/connections/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, linkedinUrl: url })
        })
        if (!res.ok) throw new Error('Failed to create connection')
        toast.success('Connection added')
        onConnectionCreated?.()
        handleReset()
        onOpenChange(false)
      } catch (e) {
        console.error(e)
        toast.error('Error adding connection')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleReset = () => {
    setName('')
    setUrl('')
    setLinkedinUsername('')
    setEnrichedData(null)
    setUseLinkedInData(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* LinkedIn Auto-fill Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Auto-fill from LinkedIn
              </CardTitle>
              <CardDescription>
                Enter a LinkedIn username to automatically populate profile data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="linkedin-username">LinkedIn Username</Label>
                  <Input 
                    id="linkedin-username" 
                    value={linkedinUsername} 
                    onChange={e => setLinkedinUsername(e.target.value)} 
                    placeholder="andrewtallents" 
                    disabled={isEnriching}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleEnrichFromLinkedIn} 
                    disabled={isEnriching || !linkedinUsername.trim()}
                    variant="outline"
                  >
                    {isEnriching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Fetch Data'
                    )}
                  </Button>
                </div>
              </div>

              {/* LinkedIn Data Preview */}
              {enrichedData && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {enrichedData.fullname}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {enrichedData.headline}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{enrichedData.current_company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{enrichedData.location?.full}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 text-xs">
                      <Badge variant="secondary">
                        {formatNumber(enrichedData.follower_count)} followers
                      </Badge>
                      <Badge variant="secondary">
                        {formatNumber(enrichedData.connection_count)} connections
                      </Badge>
                      {enrichedData.is_creator && <Badge variant="secondary">Creator</Badge>}
                      {enrichedData.is_influencer && <Badge variant="secondary">Influencer</Badge>}
                      {enrichedData.is_premium && <Badge variant="secondary">Premium</Badge>}
                    </div>

                    {enrichedData.about && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {enrichedData.about.substring(0, 200)}...
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Manual Entry Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">
              {useLinkedInData ? 'Review and Edit Details' : 'Manual Entry'}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Jane Doe" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">LinkedIn Profile URL</Label>
                <Input 
                  id="url" 
                  value={url} 
                  onChange={e => setUrl(e.target.value)} 
                  placeholder="https://linkedin.com/in/..." 
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {enrichedData && (
              <Button 
                onClick={() => {
                  setEnrichedData(null)
                  setUseLinkedInData(false)
                  setLinkedinUsername('')
                }} 
                variant="outline"
                disabled={isSaving}
              >
                Clear LinkedIn Data
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={isSaving || (!name.trim() || !url.trim())} 
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                useLinkedInData ? 'Save with LinkedIn Data' : 'Add Connection'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
