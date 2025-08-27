#!/usr/bin/env tsx

import fs from 'fs'
import csv from 'csv-parser'
import { supabaseService } from '../services/supabase'
import logger from '../lib/logger'

interface PodcastRow {
  title: string
  transcript: string
}

interface TranscriptSegment {
  speaker: 'andrew' | 'guest' | 'host'
  text: string
  order: number
}

/**
 * Parse transcript to separate Andrew's voice from guests
 */
function parseTranscriptSegments(transcript: string, episodeTitle: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  let segmentOrder = 0

  // Split by speaker patterns
  const paragraphs = transcript.split(/\n\n|\. (?=[A-Z])/g)
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length < 50) continue // Skip very short segments
    
    let speaker: 'andrew' | 'guest' | 'host' = 'guest'
    
    // Identify Andrew's voice patterns
    const andrewIndicators = [
      /andrew talent/i,
      /hosted by me/i,
      /confessions of a successful leader/i,
      /self[- ]coaching expert/i,
      /welcome to another episode/i,
      /i'm delighted/i,
      /looking forward to hearing/i,
      /tell the audience/i,
      /what about you/i,
      /so let's take/i,
      /tell us about/i,
      /what shaped/i
    ]
    
    // Check if this segment is likely Andrew speaking
    const isAndrew = andrewIndicators.some(pattern => pattern.test(paragraph))
    
    if (isAndrew) {
      speaker = 'andrew'
    }
    
    // Check for typical host intro patterns
    if (paragraph.includes('Hello and welcome') || paragraph.includes('hosted by me')) {
      speaker = 'andrew'
    }
    
    // Check for guest responses (longer, more personal)
    if (paragraph.length > 1000 && !isAndrew) {
      speaker = 'guest'
    }
    
    segments.push({
      speaker,
      text: paragraph.trim(),
      order: segmentOrder++
    })
  }
  
  return segments
}

/**
 * Extract voice patterns from Andrew's segments
 */
function extractVoicePatterns(segments: TranscriptSegment[]) {
  const andrewSegments = segments.filter(s => s.speaker === 'andrew')
  const patterns = []
  
  for (const segment of andrewSegments) {
    const text = segment.text
    
    // Extract different pattern types
    if (text.includes('Hello and welcome') || text.includes('welcome to')) {
      patterns.push({
        pattern_type: 'opening',
        pattern_text: text,
        confidence_score: 0.9,
        usage_context: 'Podcast introduction',
        emotional_tone: 'welcoming',
        authenticity_indicators: ['warm greeting', 'show branding', 'host identity']
      })
    }
    
    if (text.includes('tell us about') || text.includes('what about you')) {
      patterns.push({
        pattern_type: 'question',
        pattern_text: text,
        confidence_score: 0.85,
        usage_context: 'Guest questioning',
        emotional_tone: 'curious',
        authenticity_indicators: ['direct inquiry', 'conversational', 'engaging']
      })
    }
    
    if (text.includes('looking forward') || text.includes('delighted')) {
      patterns.push({
        pattern_type: 'transition',
        pattern_text: text,
        confidence_score: 0.8,
        usage_context: 'Episode transition',
        emotional_tone: 'enthusiastic',
        authenticity_indicators: ['positive anticipation', 'genuine interest']
      })
    }
  }
  
  return patterns
}

/**
 * Main import function
 */
async function importPodcastData() {
  logger.info('Starting podcast transcript import...')
  
  const csvPath = '/Users/tommyrichardson/Cursor/LinkedIn-AI-Content-Andrew-Tallents-clean/Pocast Transcripts.csv'
  const results: PodcastRow[] = []
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({ 
        headers: ['title', 'transcript'],
        skipEmptyLines: true 
      }))
      .on('data', (data) => {
        if (data.title && data.transcript && data.title.trim() && data.transcript.trim()) {
          results.push({
            title: data.title.trim(),
            transcript: data.transcript.trim()
          })
        }
      })
      .on('end', async () => {
        try {
          logger.info(`Processing ${results.length} podcast episodes`)
          
          for (const [index, row] of results.entries()) {
            logger.info(`Processing episode ${index + 1}: ${row.title.substring(0, 50)}...`)
            
            // Insert episode
            const episodeData = {
              title: row.title,
              guest_name: extractGuestName(row.title),
              transcript_raw: row.transcript,
              duration_minutes: estimateDuration(row.transcript),
              episode_date: extractEpisodeDate(row.title)
            }
            
            const episode = await supabaseService.insertPodcastEpisode(episodeData)
            if (!episode) {
              logger.error(`Failed to insert episode: ${row.title}`)
              continue
            }
            
            // Parse and insert segments
            const segments = parseTranscriptSegments(row.transcript, row.title)
            logger.info(`Found ${segments.length} segments, ${segments.filter(s => s.speaker === 'andrew').length} from Andrew`)
            
            for (const segment of segments) {
              const segmentData = {
                episode_id: episode.id,
                speaker: segment.speaker,
                segment_text: segment.text,
                segment_order: segment.order,
                word_count: segment.text.split(' ').length
              }
              
              const insertedSegment = await supabaseService.insertTranscriptSegment(segmentData)
              
              // Extract and insert voice patterns for Andrew's segments
              if (segment.speaker === 'andrew' && insertedSegment) {
                const patterns = extractVoicePatterns([segment])
                
                for (const pattern of patterns) {
                  await supabaseService.insertVoicePattern({
                    segment_id: insertedSegment.id,
                    ...pattern
                  })
                }
              }
            }
            
            logger.info(`✅ Processed episode: ${row.title}`)
          }
          
          logger.info(`🎉 Successfully imported ${results.length} podcast episodes`)
          resolve()
        } catch (error) {
          logger.error('Error processing CSV data:', error)
          reject(error)
        }
      })
      .on('error', (error) => {
        logger.error('Error reading CSV file:', error)
        reject(error)
      })
  })
}

/**
 * Helper functions
 */
function extractGuestName(title: string): string | null {
  // Extract guest name from title patterns like "EP. 095: Title: Guest Name on Topic"
  const match = title.match(/:\s*([^:]+)\s*on\s+/i)
  if (match) {
    return match[1].trim()
  }
  
  // Try other patterns
  const colonMatch = title.match(/:\s*(.+)/)
  if (colonMatch) {
    const afterColon = colonMatch[1].trim()
    // If it contains "on" assume name is before "on"
    const onMatch = afterColon.match(/^([^:]+?)\s+on\s+/i)
    if (onMatch) {
      return onMatch[1].trim()
    }
  }
  
  return null
}

function extractEpisodeDate(title: string): string | null {
  // Could enhance this to parse actual dates if available in titles
  return null
}

function estimateDuration(transcript: string): number {
  // Rough estimate: average speaking rate is ~150 words per minute
  const wordCount = transcript.split(' ').length
  return Math.round(wordCount / 150)
}

// Run the import
if (require.main === module) {
  importPodcastData()
    .then(() => {
      logger.info('Podcast import completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Podcast import failed:', error)
      process.exit(1)
    })
}

export { importPodcastData }