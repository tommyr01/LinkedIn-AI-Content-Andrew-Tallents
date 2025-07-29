"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Sparkles, Copy, Save, Wand2, TrendingUp, User, Zap, Linkedin, Twitter, Instagram, Send } from "lucide-react"

interface ContentVariation {
  content: string
  hashtags: string[]
  estimated_voice_score: number
  approach?: string
  tone?: string
  wordCount?: number
}

interface ContentGeneratorProps {
  onContentSaved?: (content: string) => void
}

export function ContentGenerator({ onContentSaved }: ContentGeneratorProps) {
  const [topic, setTopic] = useState("")
  const [postType, setPostType] = useState("Thought Leadership")
  const [tone, setTone] = useState("professional")
  const [useAndrewVoice, setUseAndrewVoice] = useState(true)
  const [targetLength, setTargetLength] = useState("medium")
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [includeCTA, setIncludeCTA] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [variations, setVariations] = useState<ContentVariation[]>([])
  const [voiceGuidelines, setVoiceGuidelines] = useState<string>("")
  const [isSavingVoice, setIsSavingVoice] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("linkedin")
  const [isSendingWebhook, setIsSendingWebhook] = useState(false)

  // Load saved voice guidelines on component mount
  useEffect(() => {
    const savedVoiceGuidelines = localStorage.getItem('voiceGuidelines')
    if (savedVoiceGuidelines) {
      setVoiceGuidelines(savedVoiceGuidelines)
    }
  }, [])

  const handleSaveVoiceGuidelines = () => {
    setIsSavingVoice(true)
    try {
      localStorage.setItem('voiceGuidelines', voiceGuidelines)
      toast.success("Voice guidelines saved successfully")
    } catch (error) {
      toast.error("Failed to save voice guidelines")
    } finally {
      setIsSavingVoice(false)
    }
  }
  
  const sendToWebhook = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic first")
      return
    }
    
    setIsSendingWebhook(true)
    try {
      // Send data to webhook
      const webhookUrl = "https://t01rich.app.n8n.cloud/webhook-test/4da72753-ab1b-4973-917f-23e6bdc97d23"
      
      // Format the super prompt template with the user's input
      const superPromptTemplate = `Act as an informed ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} expert specializing in content for **Target Avatar**. You will be provided with specific details about a news topic relevant to this audience. You must only provide the output required. Do not include any other additional information about how or why the response is good. Provide only the output according to the below guidelines.

**Mandatory Tone of Voice:**
You must consult the tone of voice guidelines in all of the responses you create. The required tone is: **"${voiceGuidelines}"**. You must write by those guidelines. Before you write any text, thoroughly embody this tone.

**Output Format:**
Please provide your response in **plain text format only**, without any special formatting elements such as hashtags, asterisks, or other markdown syntax in the main body. Use clear and concise language, and structure your response using paragraphs. Emojis may be used appropriately for emphasis and engagement if they fit the specified tone of voice.

**Input Topic Data (Use this information to craft the post):**
Topic: ${topic}
Post Type: ${postType}
Platform: ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}`
      
      // Data to send to webhook
      const webhookData = {
        topic,
        voiceGuidelines,
        platform: selectedPlatform,
        postType,
        tone,
        superPrompt: superPromptTemplate
      }
      
      toast.loading("Sending data to webhook...")
      
      // Send data to webhook
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      })
      
      if (!webhookResponse.ok) {
        toast.error("Failed to send data to webhook")
        console.error('Webhook call failed')
      } else {
        toast.success("Data sent to webhook successfully")
        console.log('Webhook call successful')
      }
    } catch (error) {
      toast.error("Error sending data to webhook")
      console.error('Error sending to webhook:', error)
    } finally {
      setIsSendingWebhook(false)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGenerating(true)
    
    try {
      // Continue with content generation
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          postType,
          tone,
          andrewVoice: useAndrewVoice,
          targetLength,
          includeHashtags,
          includeCTA,
          variationCount: 3,
          voiceGuidelines: voiceGuidelines.trim() ? voiceGuidelines : undefined,
          platform: selectedPlatform,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      
      // Enhance variations with additional metadata
      const enhancedVariations = data.variations?.map((variation: any, index: number) => ({
        ...variation,
        wordCount: variation.content.split(' ').length,
        approach: variation.approach || `Approach ${index + 1}`,
        tone: variation.tone || tone,
      })) || []

      setVariations(enhancedVariations)
      toast.success(`Generated ${enhancedVariations.length} variations with Andrew's voice`)

    } catch (error) {
      console.error('Error generating content:', error)
      toast.error('Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const getVoiceScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    if (score >= 50) return "text-orange-600"
    return "text-red-600"
  }

  const getVoiceScoreBg = (score: number) => {
    if (score >= 85) return "bg-green-100"
    if (score >= 70) return "bg-yellow-100"
    if (score >= 50) return "bg-orange-100"
    return "bg-red-100"
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
            Generate LinkedIn posts with Andrew's authentic voice and style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic or Idea</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[100px]"
              placeholder="Enter your topic, idea, or key message for the LinkedIn post..."
            />
          </div>
          
          {/* Tone of Voice Guidelines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="voiceGuidelines">Tone of Voice</Label>
              <Button 
                onClick={handleSaveVoiceGuidelines} 
                variant="outline" 
                size="sm"
                disabled={isSavingVoice}
              >
                {isSavingVoice ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <Textarea
              id="voiceGuidelines"
              value={voiceGuidelines}
              onChange={(e) => setVoiceGuidelines(e.target.value)}
              className="min-h-[80px] resize-y"
              placeholder="Enter tone of voice guidelines or examples to help shape AI content generation..."
            />
          </div>
          
          {/* Social Media Platform Selection */}
          <div className="space-y-2">
            <Label>Social Media Platform</Label>
            <div className="grid grid-cols-3 gap-4">
              <Button
                type="button"
                variant={selectedPlatform === "linkedin" ? "default" : "outline"}
                className={`flex items-center gap-2 ${selectedPlatform === "linkedin" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                onClick={() => setSelectedPlatform("linkedin")}
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                type="button"
                variant={selectedPlatform === "twitter" ? "default" : "outline"}
                className={`flex items-center gap-2 ${selectedPlatform === "twitter" ? "bg-sky-500 hover:bg-sky-600" : ""}`}
                onClick={() => setSelectedPlatform("twitter")}
              >
                <Twitter className="h-4 w-4" />
                X.com
              </Button>
              <Button
                type="button"
                variant={selectedPlatform === "instagram" ? "default" : "outline"}
                className={`flex items-center gap-2 ${selectedPlatform === "instagram" ? "bg-pink-600 hover:bg-pink-700" : ""}`}
                onClick={() => setSelectedPlatform("instagram")}
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </Button>
            </div>
            <div className="mt-4">
              <Button 
                onClick={sendToWebhook}
                disabled={isSendingWebhook || !topic.trim()}
                className="w-full"
                variant="outline"
                size="lg"
              >
                {isSendingWebhook ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Sending Data to Webhook...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Data to Webhook
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Voice Settings */}
          <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Voice & Style Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use Andrew's Voice</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate content using Andrew's authentic coaching voice and style
                  </p>
                </div>
                <Switch
                  checked={useAndrewVoice}
                  onCheckedChange={setUseAndrewVoice}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postType">Post Type</Label>
                  <Select value={postType} onValueChange={setPostType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Thought Leadership">Thought Leadership</SelectItem>
                      <SelectItem value="Tips">Tips & Insights</SelectItem>
                      <SelectItem value="Story">Personal Story</SelectItem>
                      <SelectItem value="Question">Engaging Question</SelectItem>
                      <SelectItem value="Announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="inspiring">Inspiring</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Target Length</Label>
                  <Select value={targetLength} onValueChange={setTargetLength}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (50-100 words)</SelectItem>
                      <SelectItem value="medium">Medium (100-200 words)</SelectItem>
                      <SelectItem value="long">Long (200-300 words)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hashtags"
                      checked={includeHashtags}
                      onCheckedChange={setIncludeHashtags}
                    />
                    <Label htmlFor="hashtags" className="text-sm">Include Hashtags</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cta"
                      checked={includeCTA}
                      onCheckedChange={setIncludeCTA}
                    />
                    <Label htmlFor="cta" className="text-sm">Include Call-to-Action</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate {useAndrewVoice ? "with Andrew's Voice" : "Professional Content"}
                {selectedPlatform && ` for ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content */}
      {variations.length > 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold tracking-tight mb-2">Generated Content</h3>
            <p className="text-muted-foreground">
              {useAndrewVoice ? "Content generated with Andrew's authentic voice" : "Professional LinkedIn content"}
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {variations.map((variation, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">Variation {index + 1}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {variation.approach}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {variation.wordCount} words
                          </Badge>
                          {useAndrewVoice && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getVoiceScoreBg(variation.estimated_voice_score)} ${getVoiceScoreColor(variation.estimated_voice_score)}`}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Voice: {variation.estimated_voice_score}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboard(variation.content)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Post
                      </Button>
                      {includeHashtags && variation.hashtags.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyWithHashtags(variation.content, variation.hashtags)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy + Tags
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Voice Score Progress Bar */}
                  {useAndrewVoice && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Voice Match Score</span>
                        <span className={getVoiceScoreColor(variation.estimated_voice_score)}>
                          {variation.estimated_voice_score}%
                        </span>
                      </div>
                      <Progress 
                        value={variation.estimated_voice_score} 
                        className="h-2"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Content */}
                    <div className="bg-muted/20 border rounded-lg p-6">
                      <div className="prose prose-sm max-w-none">
                        <p className="leading-relaxed whitespace-pre-wrap text-foreground">
                          {variation.content}
                        </p>
                      </div>
                    </div>
                    
                    {/* Hashtags */}
                    {variation.hashtags.length > 0 && includeHashtags && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Suggested Hashtags:</Label>
                        <div className="flex flex-wrap gap-2">
                          {variation.hashtags.map((hashtag, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => {
                                navigator.clipboard.writeText(hashtag)
                                toast.success(`Copied ${hashtag}`)
                              }}
                            >
                              {hashtag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Metadata */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                      <span>Style: {variation.tone}</span>
                      <span>•</span>
                      <span>Length: {targetLength}</span>
                      {useAndrewVoice && (
                        <>
                          <span>•</span>
                          <span className={getVoiceScoreColor(variation.estimated_voice_score)}>
                            {variation.estimated_voice_score >= 85 ? "Excellent voice match" :
                             variation.estimated_voice_score >= 70 ? "Good voice match" :
                             variation.estimated_voice_score >= 50 ? "Fair voice match" : "Needs refinement"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              💡 Click any hashtag to copy it individually, or use the copy buttons for full content
            </p>
            {useAndrewVoice && (
              <p className="text-xs text-muted-foreground">
                Voice scores above 70% indicate strong alignment with Andrew's authentic style
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}