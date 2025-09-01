"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerformanceContentGenerator } from "@/components/performance-content-generator"
import { RagChatInterface } from "@/components/rag-chat-interface"
import { Sparkles, Brain, BarChart3, TrendingUp, MessageSquare } from "lucide-react"

export default function ContentPage() {
  const [activeGenerator, setActiveGenerator] = useState<'performance' | 'chat'>('chat')

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Strategic Intelligence Creation</h2>
          <p className="text-muted-foreground">
            Generate executive-level LinkedIn intelligence with Andrew's authentic voice patterns and strategic positioning
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            RAG-Powered Intelligence
          </Badge>
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            Executive-Optimized
          </Badge>
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Strategic Voice
          </Badge>
        </div>
      </div>

      {/* Generator Selection */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all duration-200 h-32 executive-card ${
            activeGenerator === 'chat' 
              ? 'border-2 border-amber-500 shadow-md bg-gradient-to-br from-amber-500/20 to-orange-500/20' 
              : 'border border-border bg-card hover:border-muted hover:bg-muted/50'
          }`}
          onClick={() => setActiveGenerator('chat')}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm ${
              activeGenerator === 'chat' ? 'text-foreground' : 'text-foreground'
            }`}>
              <MessageSquare className={`h-4 w-4 ${
                activeGenerator === 'chat' ? 'text-foreground' : 'text-amber-400'
              }`} />
              Strategic Intelligence Chat
              <Badge variant="outline" className="bg-amber-500 text-white border-amber-400 ml-auto text-xs px-2 py-0">
                AMPLIFY
              </Badge>
            </CardTitle>
            <CardDescription className={`text-xs ${
              activeGenerator === 'chat' ? 'text-muted-foreground' : 'text-muted-foreground'
            }`}>
              Executive AI assistant powered by Andrew's strategic knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'chat' ? 'text-amber-400' : 'text-amber-500'
              }`}>
                <Brain className="h-3 w-3" />
                RAG System
              </div>
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'chat' ? 'text-blue-400' : 'text-blue-500'
              }`}>
                <MessageSquare className="h-3 w-3" />
                Chat Interface
              </div>
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'chat' ? 'text-purple-400' : 'text-purple-500'
              }`}>
                <Sparkles className="h-3 w-3" />
                Real-time
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 h-32 executive-card ${
            activeGenerator === 'performance' 
              ? 'border-2 border-amber-500 shadow-md bg-gradient-to-br from-amber-500/20 to-orange-500/20' 
              : 'border border-border bg-card hover:border-muted hover:bg-muted/50'
          }`}
          onClick={() => setActiveGenerator('performance')}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm ${
              activeGenerator === 'performance' ? 'text-foreground' : 'text-foreground'
            }`}>
              <Brain className={`h-4 w-4 ${
                activeGenerator === 'performance' ? 'text-foreground' : 'text-blue-400'
              }`} />
              Strategic Intelligence Generator
              <Badge variant="outline" className="bg-green-500 text-white border-green-400 ml-auto text-xs px-2 py-0">
                Executive
              </Badge>
            </CardTitle>
            <CardDescription className={`text-xs ${
              activeGenerator === 'performance' ? 'text-muted-foreground' : 'text-muted-foreground'
            }`}>
              Executive-level intelligence variants using Andrew's proven strategic patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'performance' ? 'text-amber-400' : 'text-amber-500'
              }`}>
                <BarChart3 className="h-3 w-3" />
                Intelligence
              </div>
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'performance' ? 'text-blue-400' : 'text-blue-500'
              }`}>
                <TrendingUp className="h-3 w-3" />
                Strategic Impact
              </div>
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'performance' ? 'text-purple-400' : 'text-purple-500'
              }`}>
                <Brain className="h-3 w-3" />
                Experimental
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Active Generator */}
      {activeGenerator === 'chat' ? (
        <RagChatInterface
          onContentGenerated={(content) => {
            console.log('Generated strategic intelligence from AMPLIFY chat:', content)
          }}
        />
      ) : (
        <PerformanceContentGenerator
          onContentGenerated={() => {
            // Handle generated drafts here if needed
          }}
        />
      )}
    </div>
  )
}