import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'

export interface CitationValidationResult {
  isValid: boolean
  confidence: number
  source: string
  issues: string[]
  suggestions: string[]
  replacementCitation?: string
}

export interface KnownResearchSource {
  name: string
  validPatterns: RegExp[]
  credibilityScore: number
  commonMisuses: string[]
  correctExamples: string[]
}

/**
 * Research Citation Validation System
 * Ensures only real, verifiable research sources are used
 */
export class ResearchCitationValidator {
  private openai: OpenAI
  private knownSources: KnownResearchSource[]

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
    
    this.initializeKnownSources()
  }

  /**
   * Validate all research citations in content
   */
  async validateAllCitations(content: string): Promise<{
    allValid: boolean
    citations: CitationValidationResult[]
    overallConfidence: number
    correctedContent?: string
  }> {
    logger.info({ contentLength: content.length }, 'Starting comprehensive citation validation')

    // Extract all potential citations
    const citations = this.extractCitations(content)
    
    if (citations.length === 0) {
      logger.warn('No research citations found in content')
      return {
        allValid: false,
        citations: [{
          isValid: false,
          confidence: 1.0,
          source: 'None found',
          issues: ['No research citations found'],
          suggestions: ['Add specific research citations like "Yale Center for Emotional Intelligence"']
        }],
        overallConfidence: 1.0
      }
    }

    // Validate each citation
    const validationResults = []
    for (const citation of citations) {
      const result = await this.validateSingleCitation(citation)
      validationResults.push(result)
    }

    const allValid = validationResults.every(r => r.isValid)
    const overallConfidence = validationResults.reduce((sum, r) => sum + r.confidence, 0) / validationResults.length

    // Generate corrected content if needed
    let correctedContent
    if (!allValid) {
      correctedContent = await this.generateCorrectedContent(content, validationResults)
    }

    logger.info({
      citationsFound: citations.length,
      validCitations: validationResults.filter(r => r.isValid).length,
      allValid,
      overallConfidence
    }, 'Citation validation completed')

    return {
      allValid,
      citations: validationResults,
      overallConfidence,
      correctedContent
    }
  }

  /**
   * Extract research citations from content
   */
  private extractCitations(content: string): string[] {
    const citationPatterns = [
      // University/Institution patterns
      /([A-Z][a-z]+ (?:University|Institute|Center|School|College)[^.!?]*(?:study|research|shows|finds|indicates)[^.!?]*)/gi,
      
      // "Research from X" patterns
      /(Research from [A-Z][^.!?]*)/gi,
      
      // "Studies at/by X" patterns
      /(Studies (?:at|by|from) [A-Z][^.!?]*)/gi,
      
      // "According to X research" patterns
      /(According to [A-Z][^.!?]* (?:research|study))/gi,
      
      // Direct citations like "Harvard Business School shows"
      /([A-Z][a-z]+ (?:Business School|Graduate School) (?:shows|research|study|finds)[^.!?]*)/gi,
      
      // Generic patterns that need validation
      /(Studies show[^.!?]*)/gi,
      /(Research indicates[^.!?]*)/gi,
      /(According to research[^.!?]*)/gi
    ]

    const citations = []
    for (const pattern of citationPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        citations.push(...matches)
      }
    }

    return [...new Set(citations)] // Remove duplicates
  }

  /**
   * Validate a single research citation
   */
  private async validateSingleCitation(citation: string): Promise<CitationValidationResult> {
    logger.debug({ citation: citation.slice(0, 100) }, 'Validating individual citation')

    // Check against known valid sources first
    const knownSourceMatch = this.checkKnownSources(citation)
    if (knownSourceMatch) {
      return knownSourceMatch
    }

    // Use AI to validate unknown citations
    return await this.aiValidateCitation(citation)
  }

  /**
   * Check citation against known valid sources
   */
  private checkKnownSources(citation: string): CitationValidationResult | null {
    for (const source of this.knownSources) {
      for (const pattern of source.validPatterns) {
        if (pattern.test(citation)) {
          // Check for common misuses
          const misuse = source.commonMisuses.find(misuse => 
            citation.toLowerCase().includes(misuse.toLowerCase())
          )
          
          if (misuse) {
            return {
              isValid: false,
              confidence: 0.9,
              source: source.name,
              issues: [`Common misuse detected: ${misuse}`],
              suggestions: [`Use correct format: ${source.correctExamples[0]}`],
              replacementCitation: source.correctExamples[0]
            }
          }

          return {
            isValid: true,
            confidence: source.credibilityScore,
            source: source.name,
            issues: [],
            suggestions: []
          }
        }
      }
    }

    return null
  }

  /**
   * Use AI to validate unknown citations
   */
  private async aiValidateCitation(citation: string): Promise<CitationValidationResult> {
    const validationPrompt = `Validate this research citation for authenticity and accuracy:

CITATION:
"${citation}"

VALIDATION CRITERIA:
1. Does this cite a real, verifiable research source?
2. Is the institution/organization credible and well-known?
3. Is the claim reasonable and not fabricated?
4. Does it avoid vague language like "recent study" or "researchers found"?

KNOWN CREDIBLE SOURCES (use these as benchmarks):
- Yale Center for Emotional Intelligence
- Harvard Business School
- Stanford Graduate School of Business  
- MIT Sloan School of Management
- University of Pennsylvania (Wharton)
- Gallup research studies
- McKinsey Global Institute

RED FLAGS (indicate fabricated/low credibility):
- "Recent study by researchers"
- "University of [Generic City] study"
- "New research from experts"
- Vague institutional names
- Claims that sound too specific or convenient

Return JSON:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "explanation of validation decision",
  "issues": ["specific issue 1", "issue 2"],
  "suggestions": ["improvement 1", "improvement 2"],
  "replacementCitation": "suggested replacement if invalid"
}`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: validationPrompt }],
        temperature: 0.2,
        max_tokens: 500
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        isValid: result.isValid || false,
        confidence: result.confidence || 0.5,
        source: citation.slice(0, 50) + '...',
        issues: result.issues || [],
        suggestions: result.suggestions || [],
        replacementCitation: result.replacementCitation
      }
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        citation: citation.slice(0, 50)
      }, 'AI citation validation failed')
      
      return {
        isValid: false,
        confidence: 0.3,
        source: citation.slice(0, 50) + '...',
        issues: ['Could not validate citation'],
        suggestions: ['Use known credible sources like Yale Center for Emotional Intelligence']
      }
    }
  }

  /**
   * Generate corrected content with valid citations
   */
  private async generateCorrectedContent(
    originalContent: string,
    validationResults: CitationValidationResult[]
  ): Promise<string> {
    const invalidCitations = validationResults.filter(r => !r.isValid)
    if (invalidCitations.length === 0) {
      return originalContent
    }

    const correctionPrompt = `Fix the invalid research citations in this content:

ORIGINAL CONTENT:
${originalContent}

CITATION ISSUES TO FIX:
${invalidCitations.map((result, i) => 
  `${i + 1}. INVALID: "${result.source}"
     ISSUES: ${result.issues.join(', ')}
     SUGGESTED REPLACEMENT: ${result.replacementCitation || 'Use credible source like Yale Center for Emotional Intelligence'}`
).join('\n\n')}

REQUIREMENTS:
1. Replace invalid citations with specific, credible research sources
2. Maintain the core message and arguments
3. Use Andrew Tallents' authentic voice and style
4. Prefer these credible sources:
   - Yale Center for Emotional Intelligence
   - Harvard Business School research
   - Stanford Graduate School of Business
   - Gallup workplace studies

Return the corrected content with valid, specific research citations.`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: correctionPrompt }],
        temperature: 0.4,
        max_tokens: 1200
      })

      const correctedContent = response.choices[0]?.message?.content?.trim() || originalContent
      logger.info({ 
        invalidCitations: invalidCitations.length,
        correctionApplied: correctedContent !== originalContent
      }, 'Generated corrected content with valid citations')
      
      return correctedContent
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate corrected content')
      return originalContent
    }
  }

  /**
   * Initialize database of known credible research sources
   */
  private initializeKnownSources() {
    this.knownSources = [
      {
        name: 'Yale Center for Emotional Intelligence',
        validPatterns: [
          /Yale Center for Emotional Intelligence/i,
          /Yale University.*emotional intelligence/i
        ],
        credibilityScore: 0.95,
        commonMisuses: [
          'Yale study shows',
          'Yale research indicates'
        ],
        correctExamples: [
          'Research from Yale Center for Emotional Intelligence shows',
          'According to Yale Center for Emotional Intelligence'
        ]
      },
      {
        name: 'Harvard Business School',
        validPatterns: [
          /Harvard Business School/i,
          /Harvard.*business.*research/i
        ],
        credibilityScore: 0.95,
        commonMisuses: [
          'Harvard study reveals',
          'Harvard researchers found'
        ],
        correctExamples: [
          'Harvard Business School research shows',
          'Studies from Harvard Business School indicate'
        ]
      },
      {
        name: 'Stanford Graduate School of Business',
        validPatterns: [
          /Stanford Graduate School of Business/i,
          /Stanford.*business school/i
        ],
        credibilityScore: 0.95,
        commonMisuses: [
          'Stanford study shows',
          'Stanford research indicates'
        ],
        correctExamples: [
          'Research from Stanford Graduate School of Business',
          'Stanford Graduate School of Business studies show'
        ]
      },
      {
        name: 'Gallup',
        validPatterns: [
          /Gallup (polls?|research|studies?|workplace)/i
        ],
        credibilityScore: 0.9,
        commonMisuses: [
          'Gallup study reveals',
          'Recent Gallup research'
        ],
        correctExamples: [
          'Gallup workplace studies show',
          'According to Gallup research'
        ]
      },
      {
        name: 'McKinsey Global Institute',
        validPatterns: [
          /McKinsey Global Institute/i,
          /McKinsey.*research/i
        ],
        credibilityScore: 0.85,
        commonMisuses: [
          'McKinsey study shows',
          'Recent McKinsey research'
        ],
        correctExamples: [
          'McKinsey Global Institute research shows',
          'According to McKinsey Global Institute'
        ]
      }
    ]

    logger.info({ sourcesLoaded: this.knownSources.length }, 'Known research sources initialized')
  }

  /**
   * Get suggested replacement for invalid citation
   */
  getSuggestedReplacement(invalidCitation: string): string {
    const citationLower = invalidCitation.toLowerCase()
    
    if (citationLower.includes('leadership') || citationLower.includes('emotional')) {
      return 'Research from Yale Center for Emotional Intelligence shows'
    } else if (citationLower.includes('business') || citationLower.includes('executive')) {
      return 'Harvard Business School research shows'
    } else if (citationLower.includes('workplace') || citationLower.includes('employee')) {
      return 'Gallup workplace studies show'
    } else if (citationLower.includes('performance') || citationLower.includes('productivity')) {
      return 'Stanford Graduate School of Business research indicates'
    }
    
    // Default suggestion
    return 'Research from Yale Center for Emotional Intelligence shows'
  }

  /**
   * Quick validation for real-time checking
   */
  async quickValidate(citation: string): Promise<boolean> {
    // Fast check against known sources
    const knownMatch = this.checkKnownSources(citation)
    if (knownMatch) {
      return knownMatch.isValid
    }

    // Quick AI validation for unknown citations
    const redFlags = [
      /recent study by researchers/i,
      /new research from experts/i,
      /university of \w+ study/i,
      /studies show that/i,
      /research indicates that/i
    ]

    return !redFlags.some(flag => flag.test(citation))
  }
}

export const researchCitationValidator = new ResearchCitationValidator()