import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// TypeScript interfaces for RAG integration
interface RagRequestBody {
  newMessage: string;  // RAG API expects 'newMessage'
  conversation_id: string;
  stream: boolean;
  messages?: Array<{ role: string; content: string }>;
}

interface CommentGenerationRequest {
  postContent: string;
  authorName: string;
  postUrl?: string;
  postId: string;
}

interface CommentGenerationResponse {
  success: boolean;
  generatedComment: string;
  metadata: {
    method: 'rag' | 'n8n' | 'mock';
    contextUsed?: any[];
    sources?: string[];
    processingTime: number;
    timestamp: string;
  };
  fallback?: boolean;
  error?: string;
}

// Enhanced Andrew-style comment generation with RAG-inspired pattern analysis
interface CommentPattern {
  condition: (content: string) => boolean;
  openings: {
    agreement: string[];
    amplification: string[];
    impact: string[];
    vulnerability: string[];
  };
  insights: string[];
  questions: string[];
  structures: string[];
}

// Pattern tracking to prevent repetition (in-memory for this session)
const usedPatterns = new Map<string, Set<string>>();

function getVariedOpening(postContent: string, postId: string): string {
  const sessionKey = `opening_${postId.slice(0, 8)}_${Date.now().toString().slice(-6)}`;
  
  if (!usedPatterns.has(sessionKey)) {
    usedPatterns.set(sessionKey, new Set());
  }
  
  const used = usedPatterns.get(sessionKey)!;
  
  // Authentic Andrew openings from voice analysis
  const openingCategories = {
    agreement: [
      "Love this", "Spot on", "So true", "This resonates deeply", "💯",
      "Yes!", "Exactly this", "Such a clear truth", "This hits home"
    ],
    amplification: [
      "Such a", "This nails it", "Powerful!", "This is gold", 
      "Perfect framing", "Such clarity here", "What stands out to me"
    ],
    impact: [
      "This stopped me scrolling", "🔥", "Raw truth here", 
      "This cuts through", "Truth bomb", "This one hits"
    ],
    vulnerability: [
      "Appreciate the realness", "Love the authentic share", 
      "This transparency matters", "Thank you for this honesty"
    ]
  };
  
  // Rotate through categories to prevent repetition
  const allOpenings = [
    ...openingCategories.agreement,
    ...openingCategories.amplification,
    ...openingCategories.impact,
    ...openingCategories.vulnerability
  ];
  
  // Filter out recently used openings
  const availableOpenings = allOpenings.filter(opening => !used.has(opening));
  
  // If we've used everything, clear the set and start fresh
  if (availableOpenings.length === 0) {
    used.clear();
    availableOpenings.push(...allOpenings);
  }
  
  // Select random opening and mark as used
  const selectedOpening = availableOpenings[Math.floor(Math.random() * availableOpenings.length)];
  used.add(selectedOpening);
  
  return selectedOpening;
}

function generateAndrewStyleFallback(postContent: string, authorName: string, postId: string = 'default'): string {
  const andrewPatterns: CommentPattern[] = [
    {
      condition: (content: string) => content.toLowerCase().includes('leadership'),
      openings: {
        agreement: ["Love this perspective", "So true", "This resonates deeply"],
        amplification: ["This nails it", "Powerful insight", "Sharp breakdown"],
        impact: ["This hits hard", "Truth bomb", "🔥"],
        vulnerability: ["Thank you for this honesty", "Takes courage to share"]
      },
      insights: [
        "in my coaching work with 100s of leaders, I've found self-leadership is the foundation everything else builds on",
        "the inner work isn't easy, but it's essential",
        "took me years to learn that clarity beats charisma every time",
        "you can't give what you don't have - energy, focus, presence",
        "momentum beats motivation",
        "for me, the shift from managing people to developing people changed everything"
      ],
      questions: [
        "What's helped you build psychological safety while maintaining high standards?",
        "How do you balance authentic vulnerability with executive presence?",
        "Where do you see the biggest gap between strategy and execution?",
        "What's your approach to leading through uncertainty?",
        "How do you protect your energy while staying accessible?"
      ],
      structures: ["acknowledgment_insight_question", "contrast_pattern", "personal_wisdom"]
    },
    {
      condition: (content: string) => content.toLowerCase().includes('team') || content.toLowerCase().includes('culture'),
      openings: {
        agreement: ["Love this", "So true", "This resonates"],
        amplification: ["This is gold", "Brilliant insight", "Perfect framing"],
        impact: ["This stopped me scrolling", "Raw truth here", "This cuts through"],
        vulnerability: ["Appreciate the realness", "Love the authentic share"]
      },
      insights: [
        "in my coaching work, I've found that energy is contagious - leaders set the temperature",
        "the best teams aren't built on perfection - they're built on trust and clarity",
        "culture isn't what you say, it's what you do when no one's watching",
        "momentum beats motivation every time",
        "you can't scale what you don't share",
        "for me, self-leadership is about building others, not just business"
      ],
      questions: [
        "How do you maintain momentum when the team hits resistance?",
        "What's your approach to shifting from control to influence?",
        "How do you help high performers who struggle with delegation?",
        "What's been your biggest learning about building trust remotely?",
        "How do you balance individual growth with team objectives?"
      ],
      structures: ["story_lesson", "problem_solution", "contrast_pattern"]
    }
  ];

  // Find matching pattern or use default with varied selection
  const matchingPatterns = andrewPatterns.filter(p => p.condition(postContent));
  const pattern = matchingPatterns.length > 0 
    ? matchingPatterns[Math.floor(Math.random() * matchingPatterns.length)]
    : andrewPatterns[0];
  
  // Get varied opening to prevent repetition
  const opening = getVariedOpening(postContent, postId);
  
  // Randomly select insight and question with variety
  const insight = pattern.insights[Math.floor(Math.random() * pattern.insights.length)];
  const question = pattern.questions[Math.floor(Math.random() * pattern.questions.length)];
  
  // Structure variety based on RAG approach
  const structures = [
    "acknowledgment_insight_question",
    "contrast_pattern", 
    "personal_wisdom",
    "story_lesson"
  ];
  
  const structure = structures[Math.floor(Math.random() * structures.length)];
  
  switch (structure) {
    case "contrast_pattern":
      const contrasts = [
        "Not about perfection - but presence",
        "Not about having all the answers - but asking better questions",
        "Not about control - but influence",
        "Not about managing people - but developing people",
        "Not about the title - but the impact",
        "Not about motivation - but momentum"
      ];
      const contrast = contrasts[Math.floor(Math.random() * contrasts.length)];
      return `${opening}, ${authorName}. ${contrast}. ${question}`;
      
    case "personal_wisdom":
      const personalStarts = [
        "For me,", "What I've found is", "took me years to learn that",
        "In my coaching work,", "still learning that", "The shift that changed everything for me:"
      ];
      const personalStart = personalStarts[Math.floor(Math.random() * personalStarts.length)];
      return `${opening}, ${authorName}. ${personalStart} ${insight.toLowerCase()}. ${question}`;
      
    case "story_lesson":
      return `${opening}, ${authorName}. ${insight}. ${question}`;
      
    default: // acknowledgment_insight_question
      return `${opening}, ${authorName}. ${insight}. ${question}`;
  }
}

// RAG API integration function
async function callRAGAPI(
  postContent: string, 
  authorName: string, 
  postId: string
): Promise<{ success: boolean; comment?: string; contextUsed?: any[]; sources?: string[]; error?: string }> {
  // Use full internal URL on Vercel for internal API calls to bypass authentication
  const ragApiUrl = process.env.RAG_API_URL || 
    (process.env.VERCEL 
      ? `https://${process.env.VERCEL_URL}/api/chat/stream`  // Full internal URL on Vercel
      : 'http://localhost:3000/api/chat/stream'); // Local development
  
  console.log('🔧 RAG URL construction debug:', {
    RAG_API_URL: process.env.RAG_API_URL,
    VERCEL: process.env.VERCEL,
    VERCEL_URL: process.env.VERCEL_URL,
    finalUrl: ragApiUrl
  });
  // Create unique conversation ID with timestamp and post hash to prevent caching
  const postHash = Buffer.from(postContent + authorName).toString('base64').slice(0, 8);
  const timestamp = Date.now();
  const conversationId = `comment_${postId}_${postHash}_${timestamp}`;
  
  // Add randomization to ensure unique responses
  const randomSeed = Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  
  // Enhanced RAG prompt based on authentic Andrew voice patterns from tone-of-voice analysis
  const prompt = `[UNIQUE_REQUEST_${randomSeed}_${now}] Generate an authentic LinkedIn comment as Andrew Tallents responding to this post by ${authorName}:

"${postContent}"

ANDREW'S AUTHENTIC VOICE REQUIREMENTS:
**TONE**: Confident mentor - authority with approachability, conversational not corporate
**STRUCTURE**: Acknowledgment + Insight + Question (1-3 sentences, under 280 chars)

**SIGNATURE PATTERNS TO USE**:
• Agreement starters: "Love this", "Such a", "Spot on", "This resonates deeply"
• Authority phrases: "I've coached 100s of CEOs/leaders", "In my coaching work"
• Personal markers: "For me", "What I've found", "In my experience"
• Core vocabulary: "self-leadership", "inner work", "clarity", "momentum", "energy"
• Action verbs: "shift", "unlock", "build", "navigate", "cultivate"
• "Not X, but Y" contrasts: "Not about perfection - but presence"

**KEY THEMES TO WEAVE IN**:
- Self-leadership precedes team leadership
- Inner work drives outer results  
- Authenticity beats perfection
- Momentum > motivation
- Leaders build others, not just business

**VOICE CHARACTERISTICS FROM ANALYSIS**:
• Use contractions naturally: "don't", "it's", "can't"
• Strategic lowercase for conversational flow: "took me years", "still learning"
• Present tense for insights: "Energy is...", "The best leaders..."
• Short punchy sentences mixed with longer ones
• Minimal emojis (👏, 🔥, 💯) - max 1 if any

**SENTENCE STARTERS TO ROTATE**:
• "Love this..." (agreement)
• "Such a..." (amplification)  
• "The shift..." (transformation)
• "What stands out..." (analysis)
• "For me..." (personal experience)
• "Spot on..." (validation)

**SIGNATURE ANDREW INSIGHTS TO ADAPT**:
• "clarity beats charisma every time"
• "you can't give what you don't have - energy, focus, presence"
• "the inner work isn't easy, but it's essential"
• "momentum beats motivation"
• "self-leadership is the foundation"
• Energy as currency/ROI concept

**QUESTION PATTERNS**:
• Implementation focus: "How do you help leaders..."
• Process curiosity: "What's your approach to..."
• Growth orientation: "How do you balance..."
• Practical application: "What's helped you..."

**YOUR TASK**: Reference specific points from ${authorName}'s post using Andrew's authentic patterns above. Focus on one key insight with genuine coaching perspective.

Generate ONLY the comment text, nothing else.`;

  const requestBody: RagRequestBody = {
    newMessage: prompt,  // RAG API expects 'newMessage'
    conversation_id: conversationId,
    stream: false,
    messages: [] // Empty conversation history for comment generation
  };

  try {
    console.log('🤖 Calling RAG API for comment generation:', {
      url: ragApiUrl,
      conversationId,
      authorName,
      postContentLength: postContent.length
    });

    const response = await fetch(ragApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ RAG API error:', response.status, errorText);
      return { 
        success: false, 
        error: `RAG API error: ${response.status} - ${errorText}` 
      };
    }

    // Handle both streaming and non-streaming responses
    if (response.headers.get('content-type')?.includes('text/plain')) {
      // Non-streaming response
      const comment = await response.text();
      console.log('✅ RAG API non-streaming response received');
      return { 
        success: true, 
        comment: comment.trim(),
        contextUsed: [],
        sources: []
      };
    } else {
      // Streaming response - collect all chunks
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let contextUsed: any[] = [];
      let sources: string[] = [];

      if (!reader) {
        return { success: false, error: 'No response body reader available' };
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]' || data === '') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'text' && parsed.content) {
                fullResponse += parsed.content;
              } else if (parsed.content) {
                fullResponse += parsed.content;
              }
              
              // Collect context and sources if available
              if (parsed.context) contextUsed.push(parsed.context);
              if (parsed.sources) sources.push(...parsed.sources);
            } catch (e) {
              // Ignore malformed JSON chunks
              console.warn('Failed to parse RAG SSE data:', data);
            }
          }
        }
      }

      console.log('✅ RAG API streaming response received');
      return { 
        success: true, 
        comment: fullResponse.trim(),
        contextUsed,
        sources: [...new Set(sources)] // Remove duplicates
      };
    }
  } catch (error: any) {
    console.error('💥 RAG API call failed:', error);
    return { 
      success: false, 
      error: error.message || 'RAG API call failed'
    };
  }
}

// n8n fallback function
async function callN8NFallback(
  postContent: string,
  authorName: string,
  postUrl: string | undefined,
  postId: string
): Promise<{ success: boolean; comment?: string; error?: string }> {
  const n8nWebhookUrl = process.env.N8N_COMMENT_WEBHOOK_URL;
  
  if (!n8nWebhookUrl) {
    return { success: false, error: 'N8N webhook URL not configured' };
  }

  try {
    console.log('📡 Falling back to n8n webhook:', n8nWebhookUrl);
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postContent,
        authorName,
        postUrl,
        postId,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ n8n webhook error:', response.status, errorText);
      return { 
        success: false, 
        error: `n8n webhook failed: ${response.status} ${errorText}` 
      };
    }

    const webhookData = await response.json();
    console.log('✅ n8n webhook response received');
    
    const comment = webhookData.generatedComment || webhookData.comment || null;
    if (!comment) {
      return { success: false, error: 'No comment in n8n response' };
    }

    return { success: true, comment };
  } catch (error: any) {
    console.error('💥 n8n fallback failed:', error);
    return { 
      success: false, 
      error: error.message || 'n8n webhook call failed'
    };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json() as CommentGenerationRequest;
    const { postContent, authorName, postUrl, postId } = body;

    if (!postContent || !authorName) {
      return NextResponse.json({ 
        error: 'Missing required fields: postContent and authorName' 
      }, { status: 400 });
    }

    console.log('🚀 RAG-powered comment generation webhook called:', {
      postId,
      authorName,
      postContentLength: postContent.length,
      hasPostUrl: !!postUrl
    });

    let generatedComment: string;
    let method: 'rag' | 'n8n' | 'mock' = 'mock';
    let contextUsed: any[] = [];
    let sources: string[] = [];
    let fallback = false;
    let processingError: string | undefined;

    // Step 1: Try RAG API first
    console.log('🎯 Step 1: Attempting RAG API comment generation...');
    const ragResult = await callRAGAPI(postContent, authorName, postId);
    
    if (ragResult.success && ragResult.comment) {
      generatedComment = ragResult.comment;
      method = 'rag';
      contextUsed = ragResult.contextUsed || [];
      sources = ragResult.sources || [];
      console.log('✅ RAG API successful');
    } else {
      console.log('⚠️ RAG API failed, attempting n8n fallback...');
      processingError = ragResult.error;
      fallback = true;

      // Step 2: Try n8n fallback
      console.log('🎯 Step 2: Attempting n8n fallback...');
      const n8nResult = await callN8NFallback(postContent, authorName, postUrl, postId);
      
      if (n8nResult.success && n8nResult.comment) {
        generatedComment = n8nResult.comment;
        method = 'n8n';
        console.log('✅ n8n fallback successful');
      } else {
        console.log('⚠️ n8n fallback failed, using Andrew-style fallback...');
        
        // Step 3: Andrew-style fallback with authentic patterns
        console.log('🎯 Step 3: Using Andrew-style fallback comment generation...');
        generatedComment = generateAndrewStyleFallback(postContent, authorName, postId);
        method = 'mock';
        console.log('✅ Andrew-style fallback response generated');
      }
    }

    const processingTime = Date.now() - startTime;

    const response: CommentGenerationResponse = {
      success: true,
      generatedComment,
      metadata: {
        method,
        contextUsed,
        sources,
        processingTime,
        timestamp: new Date().toISOString()
      },
      fallback,
      ...(processingError && { error: processingError })
    };

    console.log(`✅ Comment generation completed:`, {
      method,
      processingTime: `${processingTime}ms`,
      commentLength: generatedComment.length,
      fallback,
      contextSources: sources.length
    });

    return NextResponse.json(response);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('💥 Error in RAG-powered comment generation:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate comment',
      details: error.message,
      metadata: {
        method: 'error',
        processingTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}