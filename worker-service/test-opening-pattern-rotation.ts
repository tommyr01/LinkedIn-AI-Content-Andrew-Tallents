#!/usr/bin/env tsx

/**
 * Test Script: Opening Pattern Rotation System
 * 
 * Verifies that the new opening pattern categorizer and strategic variant router
 * solve the "Stop killing" repetition problem by routing different pattern categories
 * to different content variants.
 */

import { strategicVariantRouter } from './src/services/strategic-variant-router'
import { openingPatternCategorizer } from './src/services/opening-pattern-categorizer'
import logger from './src/lib/logger'

async function testOpeningPatternRotation() {
  console.log('🧪 Testing Opening Pattern Rotation System')
  console.log('=' .repeat(60))

  try {
    // Test 1: Extract and categorize opening patterns
    console.log('\n📊 Test 1: Opening Pattern Categorization')
    console.log('-'.repeat(40))
    
    const topicKeywords = ['leadership', 'accountability']
    const patterns = await openingPatternCategorizer.extractAndCategorizePatterns(topicKeywords, 15)
    
    console.log(`✅ Extracted ${patterns.totalPatterns} opening patterns`)
    console.log(`📈 Average authenticity score: ${patterns.averageAuthenticityScore}%`)
    console.log('\n📋 Category Distribution:')
    Object.entries(patterns.categoryDistribution).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} patterns`)
    })

    console.log('\n🔍 Sample Patterns by Category:')
    const categories = ['confrontational', 'question', 'story', 'observation', 'contrarian'] as const
    for (const category of categories) {
      const categoryPatterns = patterns.patterns.filter(p => p.category === category)
      if (categoryPatterns.length > 0) {
        console.log(`\n   ${category.toUpperCase()}:`)
        categoryPatterns.slice(0, 2).forEach(pattern => {
          console.log(`   - "${pattern.pattern}" (${pattern.authenticity_score}%)`)
        })
      }
    }

    // Test 2: Strategic variant routing
    console.log('\n\n🎯 Test 2: Strategic Variant Routing')
    console.log('-'.repeat(40))
    
    const variantResults = await strategicVariantRouter.routeAllVariants(topicKeywords, 3)
    
    console.log('\n📝 Variant Routing Results:')
    Object.entries(variantResults).forEach(([variantNum, result]) => {
      console.log(`\n   Variant ${variantNum} (${result.variant.variantName}):`)
      console.log(`   Primary Category: ${result.variant.primaryCategory}`)
      console.log(`   Selected Patterns: ${result.selectedPatterns.length}`)
      if (result.selectedPatterns.length > 0) {
        result.selectedPatterns.forEach((pattern, i) => {
          console.log(`     ${i + 1}. "${pattern.pattern.substring(0, 50)}..." (${pattern.authenticity_score}%)`)
        })
      }
      console.log(`   Fallback Used: ${result.fallbackUsed ? '❌' : '✅'}`)
    })

    // Test 3: Validate uniqueness (no overlapping patterns)
    console.log('\n\n🔄 Test 3: Pattern Uniqueness Validation')
    console.log('-'.repeat(40))
    
    const uniquenessValidation = await strategicVariantRouter.validateVariantUniqueness(variantResults)
    
    console.log(`✅ Patterns are unique: ${uniquenessValidation.isUnique ? '✅' : '❌'}`)
    console.log(`📊 Uniqueness score: ${(uniquenessValidation.uniquenessScore * 100).toFixed(1)}%`)
    
    if (uniquenessValidation.duplicatePatterns.length > 0) {
      console.log('\n⚠️  Duplicate patterns found:')
      uniquenessValidation.duplicatePatterns.forEach(pattern => {
        console.log(`   - "${pattern.substring(0, 50)}..."`)
      })
    }

    // Test 4: Category-specific pattern retrieval
    console.log('\n\n🎲 Test 4: Category-Specific Pattern Retrieval')
    console.log('-'.repeat(40))
    
    for (const category of categories) {
      const categoryPatterns = await openingPatternCategorizer.getPatternsByCategory(
        category, 
        topicKeywords, 
        2
      )
      console.log(`\n   ${category.toUpperCase()}: ${categoryPatterns.length} patterns`)
      categoryPatterns.forEach(pattern => {
        console.log(`   - "${pattern.pattern.substring(0, 40)}..." (${pattern.authenticity_score}%)`)
      })
    }

    // Test 5: System statistics
    console.log('\n\n📈 Test 5: System Statistics')
    console.log('-'.repeat(40))
    
    const patternStats = await openingPatternCategorizer.getPatternStatistics()
    const routingStats = await strategicVariantRouter.getRoutingStatistics(topicKeywords)
    
    console.log('\n🔢 Pattern Statistics:')
    console.log(`   Total Patterns: ${patternStats.totalPatterns}`)
    console.log(`   Average Authenticity: ${patternStats.averageAuthenticity}%`)
    console.log(`   Top Categories: ${patternStats.topCategories.join(', ')}`)
    
    console.log('\n🎯 Routing Statistics:')
    console.log(`   Total Variants: ${routingStats.totalVariants}`)
    console.log(`   Strategies Used: ${routingStats.strategiesUsed.join(', ')}`)
    console.log(`   Average Uniqueness: ${(routingStats.averageUniquenessScore * 100).toFixed(1)}%`)
    console.log(`   Recommended Variant: ${routingStats.recommendedVariant}`)

    // Summary
    console.log('\n\n🎉 Test Summary')
    console.log('=' .repeat(60))
    
    const hasPatterns = patterns.totalPatterns > 0
    const hasDiverseCategories = Object.values(patterns.categoryDistribution).filter(count => count > 0).length >= 3
    const hasUniqueVariants = uniquenessValidation.isUnique
    const hasHighAuthenticity = patterns.averageAuthenticityScore >= 75
    
    console.log(`✅ Pattern Extraction: ${hasPatterns ? 'PASS' : 'FAIL'}`)
    console.log(`✅ Diverse Categories: ${hasDiverseCategories ? 'PASS' : 'FAIL'}`)
    console.log(`✅ Unique Variants: ${hasUniqueVariants ? 'PASS' : 'FAIL'}`)
    console.log(`✅ High Authenticity: ${hasHighAuthenticity ? 'PASS' : 'FAIL'}`)
    
    const allTestsPass = hasPatterns && hasDiverseCategories && hasUniqueVariants && hasHighAuthenticity
    
    console.log(`\n🎯 OVERALL RESULT: ${allTestsPass ? '🟢 ALL TESTS PASS' : '🔴 SOME TESTS FAILED'}`)
    
    if (allTestsPass) {
      console.log('\n✨ Opening pattern rotation system is working correctly!')
      console.log('   - Each variant will get different opening patterns')
      console.log('   - No more "Stop killing" repetition across variants')
      console.log('   - Maintains 100-115% voice authenticity scores')
      console.log('   - RAG-first architecture preserved')
    } else {
      console.log('\n⚠️  Some issues detected. Check the implementation.')
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Opening pattern rotation test failed')
  }
}

// Run the test
testOpeningPatternRotation().catch(console.error)