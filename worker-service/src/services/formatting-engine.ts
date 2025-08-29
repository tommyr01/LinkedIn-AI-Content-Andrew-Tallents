import logger from '../lib/logger'

export interface AndrewFormattingSignature {
  structure_type: 'challenge-reframe' | 'research-backed' | 'story-insight' | 'authority-challenge'
  required_elements: string[]
  optional_elements: string[]
  cta_type: string
  estimated_engagement_boost: number
}

export interface FormattingResult {
  formatted_content: string
  structure_applied: string
  elements_added: string[]
  authenticity_boost: number
  formatting_confidence: number
}

/**
 * Andrew Tallents Formatting Template Engine
 * Applies his signature formatting patterns to ensure authenticity
 */
export class FormattingEngine {
  
  private readonly ANDREW_SIGNATURE_TEMPLATES = {
    'challenge-reframe': {
      opening: 'CONFRONTATIONAL_STATEMENT',
      hook: 'SHORT_PUNCHY_LINE',
      truth_reveal: 'Here\'s the truth:',
      body_structure: 'NUMBERED_POINTS_WITH_EMOJIS',
      insight: 'RESEARCH_BACKED_INSIGHT',
      authority: 'CLOSING_AUTHORITY_STATEMENT',
      separator: '-------------------------------------------------------',
      cta_follow: '▶️ Follow me if you\'re a CEO or founder scaling fast and refusing to burn out doing it.',
      cta_newsletter: '🧭 P.S. Subscribe to Self-Coaching for Leaders - my newsletter where I share the strategies that help leaders thrive without burning out.',
      cta_repost: '♻️ Repost if this feels like something your network needs to hear.'
    },
    'research-backed': {
      opening: 'RESEARCH_CITATION_OPENING',
      hook: 'CONTRARIAN_STATEMENT',
      truth_reveal: 'But here\'s what the research actually shows:',
      body_structure: 'BULLET_POINTS_WITH_CHECKMARKS',
      insight: 'AUTHORITY_ESTABLISHMENT',
      authority: 'CHALLENGE_TO_READER',
      separator: '-------------------------------------------------------',
      cta_follow: '▶️ Follow me for research-backed leadership insights that actually work.',
      cta_newsletter: '🧭 P.S. Get evidence-based leadership strategies in my newsletter Self-Coaching for Leaders.',
      cta_repost: '♻️ Repost if your network needs to see this research.'
    },
    'story-insight': {
      opening: 'PERSONAL_STORY_OPENING',
      hook: 'VULNERABLE_ADMISSION',
      truth_reveal: 'Here\'s what I learned:',
      body_structure: 'STORY_PROGRESSION_WITH_INSIGHTS',
      insight: 'UNIVERSAL_PRINCIPLE',
      authority: 'PRACTICAL_APPLICATION',
      separator: '-------------------------------------------------------',
      cta_follow: '▶️ Follow me for honest insights on leadership and self-awareness.',
      cta_newsletter: '🧭 P.S. More stories and insights in my newsletter Self-Coaching for Leaders.',
      cta_repost: '♻️ Repost if this story resonates with your journey.'
    },
    'authority-challenge': {
      opening: 'BOLD_AUTHORITY_STATEMENT',
      hook: 'CHALLENGE_TO_CONVENTIONAL_THINKING',
      truth_reveal: 'Here\'s the shift:',
      body_structure: 'CONTRAST_POINTS_MOST_VS_BEST',
      insight: 'CLIENT_SUCCESS_PATTERN',
      authority: 'EXPERTISE_DEMONSTRATION',
      separator: '-------------------------------------------------------',
      cta_follow: '▶️ Follow me if you want to lead differently than everyone else.',
      cta_newsletter: '🧭 P.S. Advanced leadership strategies in my newsletter Self-Coaching for Leaders.',
      cta_repost: '♻️ Repost if you believe leadership should be different.'
    }
  }

  private readonly ANDREW_SIGNATURE_PATTERNS = {
    diverse_openings: [
      'X is killing your Y', // Confrontational
      'What if the real problem is...', // Question
      'Last week, a founder told me...', // Story
      'The best leaders I work with...', // Observation
      'Everyone says X, but...' // Contrarian
    ],
    truth_reveals: [
      'Here\'s the truth:',
      'But here\'s the shift:',
      'Here\'s what the research actually shows:',
      'But here\'s what I\'ve learned:'
    ],
    authority_phrases: [
      'The best founders I work with',
      'Top performers don\'t',
      'Successful leaders',
      'In my experience coaching',
      'Research from Yale/Harvard shows'
    ],
    dramatic_elements: [
      '…', // ellipses for pauses
      '💡', // insight emoji
      '➡️', // direction emoji
      '✅', // validation emoji
    ],
    numbered_emojis: ['1️⃣', '2️⃣', '3️⃣'],
    checkmark_bullets: ['✅', '✔️'],
    signature_closers: [
      'That\'s not leadership.',
      'That\'s survival.',
      'That\'s growth.',
      'That\'s self-leadership.'
    ]
  }

  /**
   * Apply Andrew's signature formatting to raw content
   */
  async applyAndrewFormatting(
    rawContent: string,
    preferredStructure?: 'challenge-reframe' | 'research-backed' | 'story-insight' | 'authority-challenge'
  ): Promise<FormattingResult> {
    try {
      logger.info({ 
        contentLength: rawContent.length, 
        preferredStructure 
      }, 'Starting Andrew formatting application')

      // Detect or use preferred structure
      const structureType = preferredStructure || this.detectOptimalStructure(rawContent)
      const template = this.ANDREW_SIGNATURE_TEMPLATES[structureType]

      // Apply signature formatting
      const formattedContent = this.applyStructureTemplate(rawContent, structureType, template)

      // Add Andrew's signature elements
      const enhancedContent = this.addSignatureElements(formattedContent, structureType)

      // Apply final polish
      const finalContent = this.applyFinalPolish(enhancedContent)

      const result: FormattingResult = {
        formatted_content: finalContent,
        structure_applied: structureType,
        elements_added: this.getElementsAdded(rawContent, finalContent),
        authenticity_boost: this.calculateAuthenticityBoost(rawContent, finalContent),
        formatting_confidence: this.calculateFormattingConfidence(finalContent, structureType)
      }

      logger.info({
        structureApplied: result.structure_applied,
        elementsAdded: result.elements_added.length,
        authenticityBoost: result.authenticity_boost,
        confidence: result.formatting_confidence
      }, 'Andrew formatting application completed')

      return result

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        contentLength: rawContent.length
      }, 'Failed to apply Andrew formatting')
      throw error
    }
  }

  /**
   * Detect optimal structure type based on content analysis
   */
  private detectOptimalStructure(content: string): 'challenge-reframe' | 'research-backed' | 'story-insight' | 'authority-challenge' {
    // Check for research citations
    if (/Yale|Harvard|Research shows|Studies indicate/i.test(content)) {
      return 'research-backed'
    }
    
    // Check for personal story elements
    if (/I remember|When I|A client of mine|Last week/i.test(content)) {
      return 'story-insight'
    }
    
    // Check for authority establishment
    if (/The best|Top performers|Successful leaders/i.test(content)) {
      return 'authority-challenge'
    }
    
    // Default to challenge-reframe (Andrew's most common pattern)
    return 'challenge-reframe'
  }

  /**
   * Apply structure template to content
   */
  private applyStructureTemplate(
    content: string, 
    structureType: string, 
    template: any
  ): string {
    let formatted = content

    // Apply Andrew's signature opening pattern
    formatted = this.ensureConfrontationalOpening(formatted)

    // Add truth reveal section
    formatted = this.addTruthRevealSection(formatted, template.truth_reveal)

    // Structure body content
    formatted = this.structureBodyContent(formatted, structureType)

    // Add strategic line breaks
    formatted = this.addStrategicLineBreaks(formatted)

    return formatted
  }

  /**
   * Ensure diverse opening patterns (not just confrontational)
   */
  private ensureConfrontationalOpening(content: string): string {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length === 0) return content

    const firstLine = lines[0]
    
    // Check if already has an engaging opening pattern (any category)
    const engagingPatterns = [
      /^[A-Z][^.!?]*\s+is killing your\s+/i, // Confrontational
      /^Stop doing\s+/i, // Confrontational
      /^What if\s+/i, // Question
      /^Why do most\s+/i, // Question
      /^Last week,?\s+/i, // Story
      /^The best (leaders|founders)\s+/i, // Observation
      /^Everyone says\s+.+,?\s+but\s+/i // Contrarian
    ]

    const hasEngagingOpening = engagingPatterns.some(pattern => pattern.test(firstLine))
    
    if (!hasEngagingOpening) {
      // Transform gentle openings into engaging ones (not just confrontational)
      let newOpening = firstLine
      
      if (/^Are you feeling/i.test(firstLine)) {
        newOpening = firstLine.replace(/^Are you feeling ([^?]+)\?/i, 'What if $1 is actually a sign of growth?')
      } else if (/^Many leaders/i.test(firstLine)) {
        newOpening = firstLine.replace(/^Many leaders ([^.]+)\./i, 'The best leaders I work with $1.')
      } else if (!firstLine.startsWith('What if')) {
        // Only add 'What if' if it doesn't already start with it
        newOpening = `What if ${firstLine.toLowerCase()}`
      }
      
      lines[0] = newOpening
    }

    return lines.join('\n')
  }

  /**
   * Add truth reveal section with Andrew's signature phrases
   */
  private addTruthRevealSection(content: string, truthPhrase: string): string {
    const lines = content.split('\n').filter(line => line.trim())
    
    // Find natural break point (usually after first paragraph)
    let insertIndex = 1
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].length < 50 || /\.$/.test(lines[i])) {
        insertIndex = i + 1
        break
      }
    }

    // Insert truth reveal if not already present
    if (!content.includes('Here\'s the truth') && !content.includes('But here\'s the shift')) {
      lines.splice(insertIndex, 0, '', truthPhrase)
    }

    return lines.join('\n')
  }

  /**
   * Structure body content with Andrew's patterns
   */
  private structureBodyContent(content: string, structureType: string): string {
    let structured = content

    // Add numbered points with emojis for clarity
    if (structureType === 'challenge-reframe' && !content.includes('1️⃣')) {
      structured = this.addNumberedPoints(structured)
    }

    // Add checkmark bullets for authority points
    if (structureType === 'research-backed' && !content.includes('✅')) {
      structured = this.addCheckmarkBullets(structured)
    }

    return structured
  }

  /**
   * Add numbered emoji points
   */
  private addNumberedPoints(content: string): string {
    const lines = content.split('\n')
    const bullets = ['1️⃣', '2️⃣', '3️⃣']
    let bulletIndex = 0

    return lines.map(line => {
      // Look for list-like content to convert
      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        if (bulletIndex < bullets.length) {
          return line.replace(/^[\s\-•]*/, `${bullets[bulletIndex++]} `)
        }
      }
      return line
    }).join('\n')
  }

  /**
   * Add checkmark bullets
   */
  private addCheckmarkBullets(content: string): string {
    const lines = content.split('\n')
    
    return lines.map(line => {
      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        return line.replace(/^[\s\-•]*/, '✅ ')
      }
      return line
    }).join('\n')
  }

  /**
   * Add strategic line breaks for Andrew's dramatic effect
   */
  private addStrategicLineBreaks(content: string): string {
    let formatted = content

    // Add line breaks before truth reveals
    formatted = formatted.replace(/(Here's the truth:|But here's the shift:)/g, '\n$1')

    // Add line breaks before signature closers
    const closers = this.ANDREW_SIGNATURE_PATTERNS.signature_closers
    closers.forEach(closer => {
      formatted = formatted.replace(new RegExp(`(${closer})`, 'g'), '\n$1')
    })

    // Add dramatic pauses with ellipses
    formatted = formatted.replace(/\. But /g, '. But…\n\n')

    return formatted
  }

  /**
   * Add Andrew's signature elements
   */
  private addSignatureElements(content: string, structureType: string): string {
    const template = this.ANDREW_SIGNATURE_TEMPLATES[structureType]
    let enhanced = content

    // Add separator and CTA section if not present
    if (!content.includes('-------------------------------------------------------')) {
      enhanced += '\n\n' + template.separator
      enhanced += '\n' + template.cta_follow
      enhanced += '\n\n' + template.cta_newsletter
      enhanced += '\n' + template.cta_repost
    }

    return enhanced
  }

  /**
   * Apply final polish to ensure Andrew's voice
   */
  private applyFinalPolish(content: string): string {
    let polished = content

    // Ensure strategic emoji usage
    polished = this.optimizeEmojiUsage(polished)

    // Fix punctuation for Andrew's style
    polished = this.optimizePunctuation(polished)

    // Ensure proper paragraph spacing
    polished = this.optimizeParagraphSpacing(polished)

    return polished
  }

  /**
   * Optimize emoji usage for Andrew's style
   */
  private optimizeEmojiUsage(content: string): string {
    let optimized = content

    // Replace generic arrow with Andrew's preferred direction emoji
    optimized = optimized.replace(/→/g, '➡️')

    // Ensure insight emoji for key points
    optimized = optimized.replace(/(\binsight\b|\bkey\b|\bimportant\b)/gi, '💡 $1')

    return optimized
  }

  /**
   * Optimize punctuation for Andrew's dramatic style
   */
  private optimizePunctuation(content: string): string {
    let optimized = content

    // Add ellipses for dramatic pauses
    optimized = optimized.replace(/\. But what/g, '. But what…')
    optimized = optimized.replace(/\. The truth is/g, '. The truth is…')

    return optimized
  }

  /**
   * Optimize paragraph spacing
   */
  private optimizeParagraphSpacing(content: string): string {
    // Ensure proper spacing around key sections
    let optimized = content
    
    // Add spacing around truth reveals
    optimized = optimized.replace(/(Here's the truth:|But here's the shift:)/g, '\n$1\n')
    
    // Clean up excessive newlines
    optimized = optimized.replace(/\n{3,}/g, '\n\n')
    
    return optimized.trim()
  }

  /**
   * Calculate elements added during formatting
   */
  private getElementsAdded(original: string, formatted: string): string[] {
    const elements: string[] = []

    if (!original.includes('Here\'s the truth') && formatted.includes('Here\'s the truth')) {
      elements.push('Truth reveal section')
    }
    
    if (!original.includes('1️⃣') && formatted.includes('1️⃣')) {
      elements.push('Numbered emoji points')
    }
    
    if (!original.includes('✅') && formatted.includes('✅')) {
      elements.push('Checkmark bullets')
    }
    
    if (!original.includes('-------------------------------------------------------') && formatted.includes('-------------------------------------------------------')) {
      elements.push('Signature CTA section')
    }
    
    if (!original.includes('▶️ Follow me') && formatted.includes('▶️ Follow me')) {
      elements.push('Andrew\'s follow CTA')
    }

    return elements
  }

  /**
   * Calculate authenticity boost from formatting
   */
  private calculateAuthenticityBoost(original: string, formatted: string): number {
    let boost = 0

    // Boost for confrontational opening
    if (this.hasConfrontationalOpening(formatted) && !this.hasConfrontationalOpening(original)) {
      boost += 25
    }

    // Boost for truth reveal sections
    if (formatted.includes('Here\'s the truth') || formatted.includes('But here\'s the shift')) {
      boost += 20
    }

    // Boost for numbered emojis
    if (formatted.includes('1️⃣') || formatted.includes('2️⃣')) {
      boost += 15
    }

    // Boost for signature CTA
    if (formatted.includes('▶️ Follow me if you\'re a CEO or founder')) {
      boost += 30
    }

    // Boost for newsletter promotion
    if (formatted.includes('Self-Coaching for Leaders')) {
      boost += 20
    }

    return Math.min(boost, 100)
  }

  /**
   * Check for confrontational opening
   */
  private hasConfrontationalOpening(content: string): boolean {
    const confrontationalPatterns = [
      /^[A-Z][^.!?]*\s+is killing your\s+/i,
      /^Stop doing\s+/i,
      /^This is why\s+/i,
      /^Control is\s+/i,
      /^Toughness is\s+/i
    ]
    
    return confrontationalPatterns.some(pattern => pattern.test(content))
  }

  /**
   * Calculate formatting confidence
   */
  private calculateFormattingConfidence(content: string, structureType: string): number {
    let confidence = 0.7 // Base confidence

    // Check for Andrew's signature elements
    if (this.hasConfrontationalOpening(content)) confidence += 0.1
    if (content.includes('Here\'s the truth') || content.includes('But here\'s the shift')) confidence += 0.1
    if (/1️⃣|2️⃣|3️⃣/.test(content)) confidence += 0.05
    if (content.includes('▶️ Follow me')) confidence += 0.1
    if (content.includes('Self-Coaching for Leaders')) confidence += 0.05

    return Math.min(confidence, 1.0)
  }

  /**
   * Validate Andrew's signature formatting
   */
  async validateAndrewFormatting(content: string, options?: { 
    variantType?: 'performance' | 'engagement' | 'experimental',
    isStrategicVariant?: boolean 
  }): Promise<{
    isValid: boolean
    missingElements: string[]
    recommendedFixes: string[]
    authenticityScore: number
  }> {
    const missingElements: string[] = []
    const recommendedFixes: string[] = []
    let authenticityScore = 60 // Base score

    // Check for engaging opening (variant-aware)
    if (options?.isStrategicVariant) {
      // For strategic variants, accept any strong opening pattern from RAG
      const hasAnyStrongOpening = /^[A-Z].{10,}[.!?]/.test(content.trim()) || 
                                 /^\w+[^.!]*\?/.test(content.trim()) ||
                                 /^(Last|This|Yesterday|Recently|I|A)\s+\w+/.test(content.trim())
      
      if (hasAnyStrongOpening) {
        authenticityScore += 20 // Full credit for RAG-retrieved patterns
        logger.info({ 
          variantType: options.variantType 
        }, 'Strategic variant formatting validation - accepting RAG-retrieved opening pattern')
      } else {
        authenticityScore += 10 // Still give partial credit for strategic variants
      }
    } else {
      // Standard validation for non-strategic content
      if (!this.hasConfrontationalOpening(content)) {
        missingElements.push('Confrontational opening')
        recommendedFixes.push('Start with "X is killing your Y" or "Stop doing X" pattern')
      } else {
        authenticityScore += 20
      }
    }

    // Check for truth reveal
    if (!content.includes('Here\'s the truth') && !content.includes('But here\'s the shift')) {
      missingElements.push('Truth reveal section')
      recommendedFixes.push('Add "Here\'s the truth:" or "But here\'s the shift:" section')
    } else {
      authenticityScore += 15
    }

    // Check for numbered structure
    if (!/1️⃣|2️⃣|3️⃣/.test(content)) {
      missingElements.push('Numbered emoji structure')
      recommendedFixes.push('Use 1️⃣ 2️⃣ 3️⃣ for key points')
    } else {
      authenticityScore += 10
    }

    // Check for signature CTA
    if (!content.includes('▶️ Follow me')) {
      missingElements.push('Andrew\'s signature follow CTA')
      recommendedFixes.push('Add "▶️ Follow me if you\'re a CEO or founder scaling fast..."')
    } else {
      authenticityScore += 20
    }

    // Check for newsletter promotion
    if (!content.includes('Self-Coaching for Leaders')) {
      missingElements.push('Newsletter promotion')
      recommendedFixes.push('Add newsletter promotion with specific Andrew branding')
    } else {
      authenticityScore += 15
    }

    // Check for repost request
    if (!content.includes('♻️ Repost if')) {
      missingElements.push('Repost engagement request')
      recommendedFixes.push('Add "♻️ Repost if this feels like something your network needs to hear."')
    } else {
      authenticityScore += 10
    }

    return {
      isValid: missingElements.length === 0,
      missingElements,
      recommendedFixes,
      authenticityScore: Math.min(authenticityScore, 100)
    }
  }
}

export const formattingEngine = new FormattingEngine()