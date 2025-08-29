'use client'

import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, TrendingUp, Brain, Target, BarChart3, Zap, Eye, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function HomePage() {
  console.log('HomePage rendering at:', new Date().toISOString())
  
  const [mounted, setMounted] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [metricsVisible, setMetricsVisible] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [tripleClickCount, setTripleClickCount] = useState(0)
  
  const fullText = 'Strategic LinkedIn Intelligence Platform'
  
  useEffect(() => {
    setMounted(true)
    
    // Staggered reveal animation
    const timer = setTimeout(() => setMetricsVisible(true), 800)
    
    // Typing animation
    let currentIndex = 0
    const typeTimer = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypedText(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typeTimer)
      }
    }, 50)
    
    // Mouse tracking for subtle parallax
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      clearTimeout(timer)
      clearInterval(typeTimer)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])
  
  const handleAmplifyClick = () => {
    setTripleClickCount(prev => prev + 1)
    if (tripleClickCount >= 2) {
      // Easter egg activated
      document.body.style.background = 'linear-gradient(45deg, #f59e0b, #dc2626, #7c3aed)'
      setTimeout(() => {
        document.body.style.background = ''
      }, 1000)
      setTripleClickCount(0)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Intelligence Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-400/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      {/* Subtle cursor glow effect */}
      <div 
        className="fixed pointer-events-none z-10 w-32 h-32 bg-orange-500/5 rounded-full blur-xl transition-all duration-300 ease-out"
        style={{
          transform: `translate(${cursorPosition.x - 64}px, ${cursorPosition.y - 64}px)`
        }}
      />
      
      <div className="max-w-4xl w-full space-y-12 relative z-20">
        {/* Header */}
        <div className={`text-center space-y-6 transition-all duration-1000 ease-out transform ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-4 shadow-2xl group hover:scale-110 transition-all duration-500 hover:shadow-orange-500/25 hover:shadow-2xl cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <TrendingUp className="h-10 w-10 text-white group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 
              className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 cursor-default select-none"
              onClick={handleAmplifyClick}
            >
              AMPLIFY
            </h1>
            <p className="text-2xl font-semibold text-orange-400 font-mono min-h-[2.5rem] flex items-center justify-center">
              <span className="border-r-2 border-orange-400 animate-pulse pr-1">
                {typedText}
              </span>
            </p>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Transform your LinkedIn presence into measurable pipeline influence with AI-powered strategic intelligence
            </p>
          </div>
        </div>

        {/* Performance Metrics Bar */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 transition-all duration-1000 ease-out transform hover:bg-slate-800/70 hover:border-orange-500/30 ${
          metricsVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div className="text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="text-2xl font-bold text-orange-400 group-hover:text-orange-300 relative">
              100%
              <div className="absolute -top-1 -right-2 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-0 group-hover:opacity-100" />
            </div>
            <div className="text-sm text-gray-400 group-hover:text-gray-300">Voice Authenticity</div>
          </div>
          <div className="text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="text-2xl font-bold text-orange-400 group-hover:text-orange-300 relative">
              4x
              <Zap className="inline w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="text-sm text-gray-400 group-hover:text-gray-300">Executive Engagement</div>
          </div>
          <div className="text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="text-2xl font-bold text-orange-400 group-hover:text-orange-300 relative">
              365+
              <div className="absolute inset-0 bg-orange-400/10 rounded-full animate-pulse opacity-0 group-hover:opacity-100" />
            </div>
            <div className="text-sm text-gray-400 group-hover:text-gray-300">Days Analysed</div>
          </div>
          <div className="text-center group hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="text-2xl font-bold text-orange-400 group-hover:text-orange-300 relative">
              14x
              <Eye className="inline w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="text-sm text-gray-400 group-hover:text-gray-300">ROI Potential</div>
          </div>
        </div>

        {/* Strategic Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center hover:bg-slate-800/70 transition-all duration-500 group hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30 cursor-pointer">
            <CardHeader>
              <div className="relative">
                <Brain className="h-10 w-10 text-orange-500 mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardTitle className="text-xl text-white group-hover:text-orange-100 transition-colors duration-300">Strategic Variants Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">Three AI agents deliver Performance-Optimised, Engagement-Focused, and Experimental content variants</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center hover:bg-slate-800/70 transition-all duration-500 group hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30 cursor-pointer">
            <CardHeader>
              <div className="relative">
                <BarChart3 className="h-10 w-10 text-orange-500 mx-auto mb-3 group-hover:scale-110 transition-all duration-300" />
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardTitle className="text-xl text-white group-hover:text-orange-100 transition-colors duration-300">Performance Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">Real-time analytics and engagement scoring with actionable optimisation recommendations</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center hover:bg-slate-800/70 transition-all duration-500 group hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/30 cursor-pointer">
            <CardHeader>
              <div className="relative">
                <Target className="h-10 w-10 text-orange-500 mx-auto mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardTitle className="text-xl text-white group-hover:text-orange-100 transition-colors duration-300">Executive Amplification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">Voice Authenticity System maintains your leadership voice with vector similarity analysis</p>
            </CardContent>
          </Card>
        </div>

        {/* Strategic Value Props */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-8 text-center hover:from-orange-500/15 hover:to-red-500/15 hover:border-orange-500/30 transition-all duration-500 group cursor-pointer hover:scale-[1.02]">
          <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-orange-100 transition-colors duration-300">Strategic Intelligence That Scales Your Leadership</h3>
          <p className="text-gray-300 mb-6 max-w-3xl mx-auto group-hover:text-gray-200 transition-colors duration-300">
            The only platform that transforms organisational complexity into actionable, data-driven insights. 
            Turn scattered performance data into executive-level strategic intelligence.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-orange-400">
            <span className="hover:text-orange-300 hover:scale-105 transition-all duration-200 cursor-pointer">• Pipeline Attribution Tracking</span>
            <span className="hover:text-orange-300 hover:scale-105 transition-all duration-200 cursor-pointer">• Decision Velocity Acceleration</span>
            <span className="hover:text-orange-300 hover:scale-105 transition-all duration-200 cursor-pointer">• Competitive Intelligence Insights</span>
            <span className="hover:text-orange-300 hover:scale-105 transition-all duration-200 cursor-pointer">• Executive Network Analytics</span>
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center space-y-6 transition-all duration-1200 ease-out transform ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}>
          <p className="text-xl text-gray-300 hover:text-gray-200 transition-colors duration-300">Ready to amplify your strategic influence?</p>
          <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 text-lg font-semibold shadow-2xl hover:shadow-orange-500/25 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
            <Link href="/dashboard">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10">Access Strategic Command Center</span>
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
            </Link>
          </Button>
          <p className="text-sm text-gray-500 hover:text-gray-400 transition-colors duration-300">Join executives using AI-powered strategic intelligence</p>
        </div>

      </div>
      
      {/* Executive Easter Egg - Triple click on AMPLIFY for hidden message */}
      <div 
        className="fixed bottom-4 right-4 text-xs text-slate-600 opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-help select-none"
        title="Triple-click AMPLIFY for strategic insights"
      >
        Strategic Mode Available
      </div>
    </div>
  )
}