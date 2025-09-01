"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Copy, 
  Bot, 
  User, 
  Trash2, 
  Loader2, 
  MessageSquare,
  Sparkles,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  error?: string
}

interface RagChatInterfaceProps {
  onContentGenerated?: (content: string) => void
}

export function RagChatInterface({ onContentGenerated }: RagChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connected')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      onContentGenerated?.(content)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const clearConversation = () => {
    setMessages([])
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsLoading(false)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Math.random().toString(36),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    const assistantMessage: Message = {
      id: Math.random().toString(36),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInput("")
    setIsLoading(true)
    setConnectionStatus('connecting')

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      setConnectionStatus('connecting')
      
      // Get conversation history (exclude streaming messages and the current user message)
      const conversationHistory = messages
        .filter(m => !m.isStreaming && !m.error)
        .map(m => ({ role: m.role, content: m.content }))
      
      console.log('🔄 Sending message to RAG API:', { 
        messages: conversationHistory,
        newMessage: userMessage.content, 
        user_id: "web_user"
      })
      
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
          newMessage: userMessage.content,
          user_id: "web_user"
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}. ${errorText}`)
      }
      
      setConnectionStatus('connected')

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Mark streaming as complete when done
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, isStreaming: false }
                : msg
            )
          )
          setIsLoading(false)
          setConnectionStatus('connected')
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]' || data === '') {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              
              // Handle text content from the RAG API
              if (parsed.type === 'text' && typeof parsed.content === 'string') {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                )
              }
              
              // Handle any other response types
              else if (parsed.content && typeof parsed.content === 'string') {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                )
              }
            } catch (e) {
              // Ignore malformed JSON
              console.warn('Failed to parse SSE data:', data)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setConnectionStatus('connected')
        return // Request was cancelled
      }

      console.error('Chat error:', error)
      setConnectionStatus('error')
      
      let errorMessage = 'Failed to generate response'
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to AMPLIFY intelligence system. Please check if the service is running.'
      } else if (error.message.includes('500')) {
        errorMessage = 'Internal server error. The AMPLIFY intelligence system may be experiencing issues.'
      } else {
        errorMessage = error.message || errorMessage
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { 
                ...msg, 
                content: '', 
                error: errorMessage,
                isStreaming: false 
              }
            : msg
        )
      )
      setIsLoading(false)
    }
  }

  const handleRetry = (messageId: string, originalPrompt: string) => {
    // Remove the failed message and retry
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
    setInput(originalPrompt)
    setTimeout(() => handleSend(), 100)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="h-[945px] flex flex-col bg-card border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              AMPLIFY Strategic Intelligence Chat
              <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                Executive AI
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Chat with Andrew's strategic intelligence system for executive content creation
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={clearConversation}
          className="border-border hover:bg-muted text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">Start Strategic Intelligence Creation</h4>
              <p className="text-muted-foreground text-sm mb-6">
                Ask me to create executive LinkedIn intelligence, analyse your strategic content, or help with executive positioning. 
                I have access to Andrew's strategic voice patterns and executive insights.
              </p>
              
              {/* Example Prompts */}
              <div className="grid md:grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setInput('Create executive LinkedIn intelligence about AI innovation in business strategy')}
                  className="p-3 text-left bg-muted hover:bg-muted/80 border border-border hover:border-amber-500/50 rounded-lg transition-all group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-amber-400 mb-1">
                    Strategic Intelligence Creation
                  </div>
                  <div className="text-xs text-muted-foreground">
                    "Create executive LinkedIn intelligence about AI innovation in business strategy"
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("Help me write executive intelligence about the strategic future of remote work")}
                  className="p-3 text-left bg-muted hover:bg-muted/80 border border-border hover:border-amber-500/50 rounded-lg transition-all group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-amber-400 mb-1">
                    Strategic Analysis
                  </div>
                  <div className="text-xs text-muted-foreground">
                    "Help me write executive intelligence about the strategic future of remote work"
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("What are some executive engagement hooks for strategic LinkedIn intelligence?")}
                  className="p-3 text-left bg-muted hover:bg-muted/80 border border-border hover:border-amber-500/50 rounded-lg transition-all group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-amber-400 mb-1">
                    Executive Strategy
                  </div>
                  <div className="text-xs text-muted-foreground">
                    "What are some executive engagement hooks for strategic LinkedIn intelligence?"
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("Create 3 strategic intelligence variations about executive leadership insights")}
                  className="p-3 text-left bg-muted hover:bg-muted/80 border border-border hover:border-amber-500/50 rounded-lg transition-all group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-amber-400 mb-1">
                    Strategic Variants
                  </div>
                  <div className="text-xs text-muted-foreground">
                    "Create 3 strategic intelligence variations about executive leadership insights"
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 max-w-4xl",
              message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              message.role === 'user' 
                ? 'bg-blue-600' 
                : 'bg-gradient-to-br from-amber-500 to-orange-600'
            )}>
              {message.role === 'user' ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>

            {/* Message */}
            <div className={cn(
              "flex flex-col gap-1 max-w-[85%]",
              message.role === 'user' ? 'items-end' : 'items-start'
            )}>
              <div className={cn(
                "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words",
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : message.error
                  ? 'bg-red-900/50 text-red-200 border border-red-700 rounded-bl-md'
                  : 'bg-muted text-foreground rounded-bl-md border border-border'
              )}>
                {message.error ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p className="text-sm opacity-90">{message.error}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {message.content || (message.isStreaming && !message.content && "...")}
                    {message.isStreaming && message.content && (
                      <span className="inline-block w-2 h-5 bg-amber-500 animate-pulse ml-1" />
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                
                {message.role === 'assistant' && message.content && !message.error && (
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => handleCopy(message.content, message.id)}
                    >
                      {copiedMessageId === message.id ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}

                {message.error && index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-amber-400 hover:text-amber-300 hover:bg-muted ml-2"
                    onClick={() => {
                      const userMessage = messages[index - 1]
                      if (userMessage?.role === 'user') {
                        handleRetry(message.id, userMessage.content)
                      }
                    }}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to create executive LinkedIn intelligence, analyse strategic performance, or provide leadership insights..."
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-amber-500 pr-12"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              </div>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Press Enter to send, Shift+Enter for new line
          </span>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              connectionStatus === 'connected' && "bg-green-500 animate-pulse",
              connectionStatus === 'connecting' && "bg-amber-500 animate-bounce",
              connectionStatus === 'error' && "bg-red-500"
            )} />
            <span className="flex items-center gap-2">
              <span>
                {connectionStatus === 'connected' && 'RAG System Connected'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'error' && 'Connection Error'}
              </span>
              <span className="text-xs text-gray-500">
                Messages: {messages.filter(m => !m.isStreaming && !m.error).length}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}