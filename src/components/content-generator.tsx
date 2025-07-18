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
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Generated Content</h3>
            <p className="text-gray-600">Choose your favorite variation and copy it to LinkedIn</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {variations.map((variation, index) => (
              <Card key={index} className="border-2 hover:border-blue-200 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900">Variation {index + 1}</CardTitle>
                        <p className="text-sm text-gray-500">Voice Score: {variation.estimated_voice_score}%</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboard(variation.content)}
                        className="hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Post
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyWithHashtags(variation.content, variation.hashtags)}
                        className="hover:bg-green-50 hover:border-green-300"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy + Tags
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Content */}
                    <div className="bg-white border-2 border-gray-100 rounded-lg p-6 shadow-sm">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {variation.content}
                        </p>
                      </div>
                    </div>
                    
                    {/* Hashtags */}
                    {variation.hashtags.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Suggested Hashtags:</h4>
                        <div className="flex flex-wrap gap-2">
                          {variation.hashtags.map((hashtag, i) => (
                            <span
                              key={i}
                              className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200"
                            >
                              {hashtag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              💡 Tip: "Copy Post" gives you just the content, "Copy + Tags" includes hashtags
            </p>
          </div>
        </div>
      )}
    </div>
  )
}