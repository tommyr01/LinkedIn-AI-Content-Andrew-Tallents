"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Sparkles, Copy, Save, Wand2 } from "lucide-react"

interface ContentVariation {
  content: string
  hashtags: string[]
  estimated_voice_score: number
}

interface ContentGeneratorProps {
  onContentSaved?: (content: string) => void
}

export function ContentGenerator({ onContentSaved }: ContentGeneratorProps) {
  const [topic, setTopic] = useState("")
  const [postType, setPostType] = useState("Thought Leadership")
  const [isGenerating, setIsGenerating] = useState(false)
  const [variations, setVariations] = useState<ContentVariation[]>([])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          postType,
          tone: 'professional',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      setVariations(data.variations || [])
      toast.success(`Generated ${data.variations?.length || 0} variations`)

    } catch (error) {
      console.error('Error generating content:', error)
      toast.error('Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success("Content copied to clipboard!")
  }

  const handleCopyWithHashtags = (content: string, hashtags: string[]) => {
    const fullContent = `${content}\n\n${hashtags.join(' ')}`
    navigator.clipboard.writeText(fullContent)
    toast.success("Content with hashtags copied!")
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Content Generator
          </CardTitle>
          <CardDescription>
            Generate LinkedIn posts in Andrew's authentic voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic or Idea</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter your topic or idea for the LinkedIn post..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Post Type</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option>Thought Leadership</option>
              <option>Tips</option>
              <option>Story</option>
              <option>Question</option>
              <option>Announcement</option>
            </select>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content */}
      {variations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Variations</h3>
          {variations.map((variation, index) => (
            <Card key={index}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Variation {index + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Voice Score: {variation.estimated_voice_score}%
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboard(variation.content)}
                        title="Copy content only"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyWithHashtags(variation.content, variation.hashtags)}
                        title="Copy content with hashtags"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        + Tags
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-sm">{variation.content}</p>
                  </div>
                  {variation.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variation.hashtags.map((hashtag, i) => (
                        <span
                          key={i}
                          className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                        >
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}