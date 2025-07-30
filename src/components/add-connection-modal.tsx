"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AddConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnectionCreated?: () => void
}

export function AddConnectionModal({ open, onOpenChange, onConnectionCreated }: AddConnectionModalProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
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
      onOpenChange(false)
      setName('')
      setUrl('')
    } catch (e) {
      console.error(e)
      toast.error('Error adding connection')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">LinkedIn Profile URL</Label>
            <Input id="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Add Connection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
