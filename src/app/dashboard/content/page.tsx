"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AsyncContentGenerator } from "@/components/async-content-generator"
import { PerformanceContentGenerator } from "@/components/performance-content-generator"
import { Sparkles, Zap, Brain, BarChart3, TrendingUp } from "lucide-react"

export default function ContentPage() {
  const [activeGenerator, setActiveGenerator] = useState<'basic' | 'performance'>('performance')

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Strategic Content Creation</h2>
          <p className="text-muted-foreground">
            Generate performance-driven LinkedIn content with Andrew's authentic voice and strategic intelligence
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Performance-Optimized
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Voice Intelligence
          </Badge>
        </div>
      </div>

      {/* Generator Selection */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeGenerator === 'performance' 
              ? 'border-2 border-amber-500 shadow-md bg-gradient-to-br from-amber-500/20 to-orange-500/20' 
              : 'border border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
          }`}
          onClick={() => setActiveGenerator('performance')}
        >
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${
              activeGenerator === 'performance' ? 'text-white' : 'text-white'
            }`}>
              <Brain className={`h-5 w-5 ${
                activeGenerator === 'performance' ? 'text-white' : 'text-blue-400'
              }`} />
              Performance-Driven Generator
              <Badge variant="outline" className="bg-green-500 text-white border-green-400 ml-auto">
                Recommended
              </Badge>
            </CardTitle>
            <CardDescription className={
              activeGenerator === 'performance' ? 'text-gray-200' : 'text-gray-400'
            }>
              Strategic content variants using Andrew's proven patterns, engagement optimization, and experimental approaches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'performance' ? 'text-amber-300' : 'text-amber-500'
              }`}>
                <BarChart3 className="h-3 w-3" />
                Performance Patterns
              </div>
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'performance' ? 'text-blue-300' : 'text-blue-500'
              }`}>
                <TrendingUp className="h-3 w-3" />
                Engagement Focus
              </div>
              <div className={`flex items-center gap-1 ${
                activeGenerator === 'performance' ? 'text-purple-300' : 'text-purple-500'
              }`}>
                <Brain className="h-3 w-3" />
                Experimental
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            activeGenerator === 'basic' 
              ? 'border-2 border-gray-500 shadow-md bg-gray-700' 
              : 'border border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
          }`}
          onClick={() => setActiveGenerator('basic')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-gray-400" />
              Basic Generator
              <Badge variant="outline" className="bg-gray-600 text-gray-300 border-gray-500 ml-auto">
                Legacy
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Simple content generation with basic AI assistance and voice matching
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Basic AI Generation
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Standard Variations
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Generator */}
      {activeGenerator === 'performance' ? (
        <PerformanceContentGenerator
          onContentGenerated={(drafts) => {
            console.log('Generated performance-driven drafts:', drafts)
          }}
        />
      ) : (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Basic Content Generator</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Using the legacy generator. For better performance and strategic insights, switch to the Performance-Driven Generator above.
            </p>
          </div>
          
          <AsyncContentGenerator
            onContentGenerated={(drafts) => {
              console.log('Generated basic drafts:', drafts)
            }}
          />
        </div>
      )}
    </div>
  )
}