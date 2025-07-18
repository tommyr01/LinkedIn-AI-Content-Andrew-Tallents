import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Linkedin, Bot, Zap } from 'lucide-react'

export default function HomePage() {
  console.log('HomePage rendering at:', new Date().toISOString())
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 rounded-full p-4">
              <Linkedin className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            LinkedIn AI Content Generator
          </h1>
          <p className="text-xl text-gray-600">
            Create engaging LinkedIn content with AI for Andrew Tallents
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="text-center">
            <CardHeader>
              <Bot className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">AI-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Generate content using GPT-4 in Andrew's voice</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Automated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Schedule and post via Lindy webhooks</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <Linkedin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Professional</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">CEO coaching insights and leadership content</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-gray-600">Ready to create engaging LinkedIn content?</p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/dashboard">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Auto-redirect script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(function() {
                window.location.href = '/dashboard';
              }, 3000);
            `
          }}
        />
      </div>
    </div>
  )
}