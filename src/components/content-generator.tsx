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
  onWebhookResponses?: (responses: string[]) => void
  onLoadingChange?: (loading: boolean) => void
}

export function ContentGenerator({ onContentSaved, onWebhookResponses, onLoadingChange }: ContentGeneratorProps) {
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
      return;
    }
    setIsSendingWebhook(true);
    onLoadingChange?.(true);
    try {
      const webhookUrl = "https://t01rich.app.n8n.cloud/webhook/4da72753-ab1b-4973-917f-23e6bdc97d23";
      const superPromptTemplate = `Act as an informed ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} expert specializing in content for **Target Avatar**. You will be provided with specific details about a news topic relevant to this audience. You must only provide the output required. Do not include any other additional information about how or why the response is good. Provide only the output according to the below guidelines.\n\n**Mandatory Tone of Voice:**\nYou must consult the tone of voice guidelines in all of the responses you create. The required tone is: **\"${voiceGuidelines}\"**. You must write by those guidelines. Before you write any text, thoroughly embody this tone.\n\n**Output Format:**\nPlease provide your response in **plain text format only**, without any special formatting elements such as hashtags, asterisks, or other markdown syntax in the main body. Use clear and concise language, and structure your response using paragraphs. Emojis may be used appropriately for emphasis and engagement if they fit the specified tone of voice.\n\n**Input Topic Data (Use this information to craft the post):**\nTopic: ${topic}\nPost Type: ${postType}\nPlatform: ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}`;
      const webhookData = {
        topic,
        voiceGuidelines,
        platform: selectedPlatform,
        postType,
        tone,
        superPrompt: superPromptTemplate
      };
  
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });
      if (webhookResponse.ok) {
        let responses: string[] = [];
        try {
          const result = await webhookResponse.json();
          if (Array.isArray(result)) {
            responses = result.map((r: any) => {
              if (typeof r === 'string') return r;
              if (r?.content) return r.content;
              if (typeof r === 'object') return JSON.stringify(r, null, 2);
              return String(r);
            });
          } else if (result.variations && Array.isArray(result.variations)) {
            responses = result.variations.map((v: any) => v.content || JSON.stringify(v));
          } else if (typeof result === 'object') {
            const postKeys = Object.keys(result).filter(k => k.startsWith('post_'));
            if (postKeys.length) {
              responses = postKeys.map(k => {
                const postObj = (result as any)[k];
                if (postObj && postObj["LinkedIn Post"]) return postObj["LinkedIn Post"];
                return JSON.stringify(postObj, null, 2);
              });
            } else {
              responses = [JSON.stringify(result, null, 2)];
            }
          } else {
            responses = [String(result)];
          }
        } catch (e) {
          const text = await webhookResponse.text();
          responses = [text];
        }
        if(responses.length){
          onWebhookResponses?.(responses);
        }
      }
    } catch (error) {
      // No toast error
    } finally {
      setIsSendingWebhook(false);
      onLoadingChange?.(false);
    }
  };

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
        </CardContent>
      </Card>
    </div>
  )
}