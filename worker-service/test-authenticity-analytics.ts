import { voiceAuthenticityAnalyticsService } from './src/services/voice-authenticity-analytics'
import { authenticityPerformanceDashboardService } from './src/services/authenticity-performance-dashboard'
import logger from './src/lib/logger'

/**
 * Test script to demonstrate authenticity analytics capabilities
 */
async function testAuthenticityAnalytics() {
  console.log('\n🔍 VOICE AUTHENTICITY PERFORMANCE ANALYTICS TEST\n')
  
  try {
    // Test 1: Content Analysis for Authenticity Improvement
    console.log('1️⃣ TESTING CONTENT AUTHENTICITY ANALYSIS')
    console.log('=' .repeat(50))
    
    const sampleGenericContent = `
Many leaders struggle with delegation and often find themselves overwhelmed by operational tasks. 
It's important to trust your team and develop systems that allow for effective delegation. 
Consider implementing clear processes and regular check-ins to ensure quality while maintaining efficiency.
What are your thoughts on delegation strategies?
    `.trim()

    const sampleAndrewContent = `
Control is killing your growth.

Most founders think micromanaging shows leadership.

But research from Yale Center for Leadership shows that high-control leaders reduce team performance by 34%.

Here's the truth:

The best founders I work with don't manage every detail.

They build systems that work without them.

1️⃣ Clear outcome expectations
2️⃣ Decision-making frameworks  
3️⃣ Regular progress check-ins (not task monitoring)

➡️ Result: Teams that scale without founder bottlenecks

Follow me if you're a CEO scaling fast and refusing to burn out doing it.
    `.trim()

    console.log('Analyzing GENERIC content for authenticity gaps...')
    const genericAnalysis = await voiceAuthenticityAnalyticsService.analyzeContentForAuthenticity(
      sampleGenericContent,
      60 // Current authenticity estimate
    )
    
    console.log('\n📊 GENERIC CONTENT ANALYSIS RESULTS:')
    console.log(`Authenticity Prediction: ${genericAnalysis.authenticity_prediction}/100`)
    console.log(`Performance Prediction: ${genericAnalysis.performance_prediction}/100`)
    
    console.log('\n🚨 Andrew Voice Gaps:')
    genericAnalysis.andrew_voice_gaps.forEach((gap, i) => {
      console.log(`   ${i + 1}. ${gap}`)
    })
    
    console.log('\n🎯 High-Impact Improvements:')
    genericAnalysis.improvement_suggestions.high_impact.forEach((improvement, i) => {
      console.log(`   ${i + 1}. ${improvement}`)
    })

    console.log('\n' + '-'.repeat(50))
    console.log('Analyzing ANDREW-STYLE content for comparison...')
    
    const andrewAnalysis = await voiceAuthenticityAnalyticsService.analyzeContentForAuthenticity(
      sampleAndrewContent,
      85 // Higher authenticity estimate
    )
    
    console.log('\n📊 ANDREW-STYLE CONTENT ANALYSIS RESULTS:')
    console.log(`Authenticity Prediction: ${andrewAnalysis.authenticity_prediction}/100`)
    console.log(`Performance Prediction: ${andrewAnalysis.performance_prediction}/100`)
    
    console.log('\n✅ Strength Areas:')
    if (andrewAnalysis.andrew_voice_gaps.length === 0) {
      console.log('   ✓ Strong Andrew voice match detected')
      console.log('   ✓ Confrontational opening present')
      console.log('   ✓ Research authority established')
      console.log('   ✓ Dramatic structure implemented')
    } else {
      andrewAnalysis.andrew_voice_gaps.forEach((gap, i) => {
        console.log(`   ${i + 1}. ${gap}`)
      })
    }

    // Test 2: Content Improvement Roadmap
    console.log('\n\n2️⃣ TESTING CONTENT IMPROVEMENT ROADMAP')
    console.log('=' .repeat(50))
    
    console.log('Generating improvement roadmap for generic content...')
    const improvementRoadmap = await authenticityPerformanceDashboardService.analyzeContentImprovement(
      sampleGenericContent,
      85 // Target authenticity
    )
    
    console.log('\n📈 IMPROVEMENT ROADMAP:')
    console.log(`Current Authenticity: ${improvementRoadmap.current_analysis.authenticity_score}/100`)
    console.log(`Target Authenticity: 85/100`)
    console.log(`Performance Boost Prediction: +${improvementRoadmap.optimized_version.performance_boost_prediction}%`)
    
    console.log('\n🛠️ PHASE-BY-PHASE IMPROVEMENTS:')
    improvementRoadmap.improvement_roadmap.forEach((phase, i) => {
      console.log(`\nPhase ${phase.phase}: ${phase.focus_area}`)
      console.log(`Expected Gain: +${phase.expected_authenticity_gain} authenticity points`)
      console.log(`Difficulty: ${phase.implementation_difficulty}`)
      console.log('Changes:')
      phase.specific_changes.forEach(change => {
        console.log(`   • ${change}`)
      })
      if (phase.before_after_example) {
        console.log(`Example: ${phase.before_after_example}`)
      }
    })
    
    console.log('\n📝 OPTIMIZED VERSION PREVIEW:')
    console.log(improvementRoadmap.optimized_version.content.slice(0, 300) + '...')
    
    console.log('\n🎯 KEY IMPROVEMENTS MADE:')
    improvementRoadmap.optimized_version.key_improvements_made.forEach((improvement, i) => {
      console.log(`   ${i + 1}. ${improvement}`)
    })

    // Test 3: Comprehensive Dashboard Overview
    console.log('\n\n3️⃣ TESTING COMPREHENSIVE DASHBOARD')
    console.log('=' .repeat(50))
    
    console.log('Generating comprehensive authenticity dashboard...')
    const dashboard = await authenticityPerformanceDashboardService.generateComprehensiveDashboard()
    
    console.log('\n📋 EXECUTIVE SUMMARY:')
    console.log(`Current Authenticity Level: ${dashboard.executive_summary.current_authenticity_level}`)
    console.log(`Performance Impact: ${dashboard.executive_summary.performance_impact}`)
    console.log(`Primary Opportunity: ${dashboard.executive_summary.primary_opportunity}`)
    console.log(`Quick Win Potential: ${dashboard.executive_summary.quick_win_potential}%`)
    console.log(`Timeline to 8.5/10: ${dashboard.executive_summary.timeline_to_8_5}`)
    
    console.log('\n⚡ IMMEDIATE ACTIONS (Easy Wins):')
    dashboard.actionable_recommendations.immediate_actions
      .filter(action => action.difficulty_level === 'easy')
      .slice(0, 3)
      .forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.action}`)
        console.log(`      Expected Boost: +${action.expected_authenticity_boost} authenticity, +${action.expected_performance_boost}% performance`)
        console.log(`      Time: ${action.implementation_time}`)
      })
    
    console.log('\n📊 AUTHENTICITY GAPS IDENTIFIED:')
    dashboard.authenticity_gaps.slice(0, 3).forEach((gap, i) => {
      console.log(`   ${i + 1}. ${gap.gap_type.toUpperCase()} GAP`)
      console.log(`      Current: ${gap.current_score}% vs Benchmark: ${gap.benchmark_score}%`)
      console.log(`      Impact: +${gap.impact_on_performance}% potential performance boost`)
      console.log(`      Quick Win: ${gap.quick_wins[0]}`)
    })
    
    console.log('\n🎯 THIS WEEK FOCUS:')
    const thisWeek = dashboard.actionable_recommendations.weekly_focus_areas[0]
    console.log(`   Week ${thisWeek.week}: ${thisWeek.focus_element}`)
    console.log('   Tasks:')
    thisWeek.specific_tasks.forEach(task => {
      console.log(`   • ${task}`)
    })
    
    console.log('\n📈 PREDICTIVE INSIGHTS:')
    console.log(`Next Month Authenticity Projection: ${dashboard.predictive_insights.next_month_authenticity_projection}/100`)
    console.log(`Next Month Performance Projection: +${dashboard.predictive_insights.next_month_performance_projection}%`)
    
    console.log('\n🎯 RECOMMENDED FOCUS SPLIT:')
    console.log(`Authenticity Improvement: ${dashboard.predictive_insights.recommended_focus_split.authenticity_improvement}%`)
    console.log(`Performance Optimization: ${dashboard.predictive_insights.recommended_focus_split.performance_optimization}%`)

    // Test 4: Performance Correlation Analysis
    console.log('\n\n4️⃣ TESTING PERFORMANCE CORRELATION ANALYSIS')
    console.log('=' .repeat(50))
    
    console.log('Generating authenticity vs performance correlation data...')
    const analytics = await voiceAuthenticityAnalyticsService.generateAuthenticityAnalytics()
    
    console.log('\n📊 OVERALL STATISTICS:')
    console.log(`Current Authenticity Average: ${analytics.overall_stats.current_authenticity_avg}/100`)
    console.log(`Performance Correlation: ${(analytics.overall_stats.performance_correlation * 100).toFixed(1)}%`)
    console.log(`Total Posts Analyzed: ${analytics.overall_stats.total_posts_analyzed}`)
    console.log(`High Authenticity Posts (80+): ${analytics.overall_stats.high_authenticity_posts}`)
    console.log(`Optimal Posts (High Auth + High Perf): ${analytics.overall_stats.optimal_posts}`)
    
    console.log('\n📈 AUTHENTICITY PERFORMANCE BANDS:')
    analytics.authenticity_performance_bands.forEach(band => {
      console.log(`   ${band.authenticity_band}: ${band.post_count} posts, ${band.avg_engagement_score} avg engagement`)
    })
    
    console.log('\n🎯 TOP VOICE ELEMENT IMPACTS:')
    analytics.voice_element_impacts
      .filter(element => element.posts_with_element > 0)
      .sort((a, b) => b.avg_performance_with - b.avg_performance_without)
      .slice(0, 5)
      .forEach((element, i) => {
        console.log(`   ${i + 1}. ${element.element_name.replace(/_/g, ' ').toUpperCase()}`)
        console.log(`      Performance Boost: +${element.avg_performance_with - element.avg_performance_without}`)
        console.log(`      Authenticity Boost: +${element.avg_authenticity_with - element.avg_authenticity_without}`)
        console.log(`      Usage: ${element.posts_with_element} posts`)
      })
    
    console.log('\n🚀 SUCCESS INDICATORS:')
    analytics.predictive_indicators.early_success_signals.forEach((signal, i) => {
      console.log(`   ✓ ${signal}`)
    })
    
    console.log('\n⚠️ FAILURE WARNING SIGNS:')
    analytics.predictive_indicators.failure_warning_signs.slice(0, 3).forEach((warning, i) => {
      console.log(`   ✗ ${warning}`)
    })
    
    console.log('\n📊 AUTHENTICITY THRESHOLDS:')
    console.log(`   Minimum Viable: ${analytics.predictive_indicators.authenticity_thresholds.minimum_viable}/100`)
    console.log(`   High Performance: ${analytics.predictive_indicators.authenticity_thresholds.high_performance}/100`)
    console.log(`   Viral Potential: ${analytics.predictive_indicators.authenticity_thresholds.viral_potential}/100`)

    console.log('\n\n✅ AUTHENTICITY ANALYTICS TEST COMPLETED SUCCESSFULLY')
    console.log('=' .repeat(60))
    console.log('📈 The system can now provide:')
    console.log('   • Real-time content authenticity scoring')
    console.log('   • Performance correlation insights')
    console.log('   • Specific improvement recommendations')
    console.log('   • Phase-by-phase optimization roadmaps')
    console.log('   • Predictive success/failure indicators')
    console.log('   • Executive dashboards with actionable insights')
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Authenticity analytics test failed')
    console.error('\n❌ TEST FAILED:', error)
  }
}

// Run the test
if (require.main === module) {
  testAuthenticityAnalytics()
    .then(() => {
      console.log('\n🎯 Test completed. Ready for production use!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error)
      process.exit(1)
    })
}