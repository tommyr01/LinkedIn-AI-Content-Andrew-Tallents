'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Key, Bot, Bell, Database, Shield, Save } from 'lucide-react'
import { toast } from "sonner"

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    airtable: '',
    lindy: ''
  })
  
  const [voiceSettings, setVoiceSettings] = useState({
    tone: 'professional',
    examples: '',
    guidelines: ''
  })
  
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    postReminders: true,
    engagementAlerts: true,
    weeklyReports: false
  })

  const saveApiKeys = () => {
    // In a real app, this would save to your backend
    toast.success('API keys saved successfully')
  }

  const saveVoiceSettings = () => {
    toast.success('Voice settings updated')
  }

  const saveNotifications = () => {
    toast.success('Notification preferences saved')
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="voice">Voice Training</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your API keys for external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                </div>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Used for AI content generation with GPT-4
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="airtable-key">Airtable API Key</Label>
                </div>
                <Input
                  id="airtable-key"
                  type="password"
                  placeholder="pat..."
                  value={apiKeys.airtable}
                  onChange={(e) => setApiKeys({ ...apiKeys, airtable: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Used for content storage and management
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="lindy-key">Lindy Webhook Token</Label>
                </div>
                <Input
                  id="lindy-key"
                  type="password"
                  placeholder="Bearer ..."
                  value={apiKeys.lindy}
                  onChange={(e) => setApiKeys({ ...apiKeys, lindy: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Used for LinkedIn posting automation
                </p>
              </div>

              <Button onClick={saveApiKeys} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save API Keys
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Add these to your Vercel deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="p-3 bg-gray-100 rounded">
                  OPENAI_API_KEY=your_openai_key_here
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  AIRTABLE_API_KEY=your_airtable_key_here
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  AIRTABLE_BASE_ID=appj9kvBVOTLQEJms
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  AIRTABLE_TABLE_ID=tblfCnMV2Gr8lgl7T
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  LINDY_WEBHOOK_URL=your_lindy_webhook_url
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  LINDY_WEBHOOK_TOKEN=your_lindy_token_here
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Training Tab */}
        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Training</CardTitle>
              <CardDescription>
                Train the AI to write in Andrew's authentic voice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Writing Tone</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={voiceSettings.tone}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, tone: e.target.value })}
                >
                  <option value="professional">Professional & Authoritative</option>
                  <option value="friendly">Friendly & Approachable</option>
                  <option value="inspirational">Inspirational & Motivating</option>
                  <option value="educational">Educational & Informative</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="examples">Example Posts (Andrew's Writing)</Label>
                <Textarea
                  id="examples"
                  placeholder="Paste 3-5 examples of Andrew's LinkedIn posts here..."
                  rows={6}
                  value={voiceSettings.examples}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, examples: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  These examples help the AI learn Andrew's writing style
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guidelines">Writing Guidelines</Label>
                <Textarea
                  id="guidelines"
                  placeholder="Add specific guidelines like: Always include a question at the end, Use personal anecdotes, etc."
                  rows={4}
                  value={voiceSettings.guidelines}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, guidelines: e.target.value })}
                />
              </div>

              <Button onClick={saveVoiceSettings} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Voice Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive email updates about your posts
                  </p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Post Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Get reminded when it's time to post
                  </p>
                </div>
                <Switch
                  checked={notifications.postReminders}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, postReminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Engagement Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when connections engage with your posts
                  </p>
                </div>
                <Switch
                  checked={notifications.engagementAlerts}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, engagementAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive weekly analytics summaries
                  </p>
                </div>
                <Switch
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, weeklyReports: checked })
                  }
                />
              </div>

              <Button onClick={saveNotifications} className="w-full">
                <Bell className="mr-2 h-4 w-4" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage access and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 text-sm">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
                  <p className="text-muted-foreground mb-3">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">API Key Rotation</h4>
                  <p className="text-muted-foreground mb-3">
                    Regularly rotate your API keys for better security
                  </p>
                  <Button variant="outline">Rotate Keys</Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Activity Log</h4>
                  <p className="text-muted-foreground mb-3">
                    View recent activity and API usage
                  </p>
                  <Button variant="outline">View Activity</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}