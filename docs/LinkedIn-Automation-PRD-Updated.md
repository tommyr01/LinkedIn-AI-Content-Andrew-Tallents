# LinkedIn Content & Engagement Assistant PRD (Updated)
*Compliance-Focused Version*

## Executive Summary

### Primary Value Propositions
- **5-7x Content Output**: Enable Andrew's assistant to create and distribute significantly more content without proportional time increase
- **AI-Assisted Workflow**: Consolidate LinkedIn activities with AI suggestions and manual approval
- **Authentic Voice Preservation**: Maintain Andrew's authentic voice through prompt engineering
- **Time Efficiency**: Reduce content creation and engagement time by 50%
- **Compliance First**: Full LinkedIn ToS compliance through browser extension approach

### Core Approach Change
**FROM**: Fully automated posting system  
**TO**: AI-assisted content creation with manual publishing through browser extension

### Success Definition
- Assistant creates 5-7 high-quality posts per week (realistic from current 2-3)
- Engagement with key connections increases by 200%
- Time spent on content creation reduced by 50%
- 75%+ authenticity score on generated content
- Zero compliance violations

---

## Scope Definition

### In Scope (Updated)
1. **AI Content Generation Interface**: GPT-4 powered content creation with Andrew's voice
2. **Content Calendar & Drafts**: Visual planning and draft management system
3. **Engagement Dashboard**: View of key connections' posts with AI comment suggestions
4. **Browser Extension**: One-click posting to LinkedIn (user-initiated)
5. **Basic Analytics**: Track post performance metrics
6. **Prompt Engineering System**: Capture Andrew's voice through examples
7. **Manual Approval Workflow**: Human-in-the-loop for all content

### Out of Scope (Clarified)
1. **Automated posting** to LinkedIn without user action
2. **Automated commenting** on posts
3. **Direct LinkedIn API posting** (compliance risk)
4. **Fully automated engagement** features
5. **Multi-platform posting** (Phase 2)
6. **Video content creation**
7. **LinkedIn advertising management**

### Compliance Strategy
- Use LinkedIn Share API for basic sharing only
- Browser extension for all LinkedIn interactions
- User must manually click to post/comment
- Clear labeling of AI-assisted content
- Regular monitoring of LinkedIn ToS updates

---

## Technical Architecture (Simplified)

### Technology Stack
```
Frontend:        Next.js 14 + TypeScript + shadcn/ui
Backend:         Supabase (PostgreSQL + Auth + Realtime)  
AI:              OpenAI GPT-4 API
Browser Ext:     Chrome Extension (Manifest V3)
Hosting:         Vercel (web) + Chrome Web Store (extension)
```

### Architecture Overview
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│    Supabase     │────▶│   OpenAI API    │
│  (Web Client)   │     │   (Database)    │     │ (Content Gen)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                
         │               ┌─────────────────┐               
         └──────────────▶│ Lindy Webhooks  │──────────────┐
                         │ (LinkedIn API)  │              │
                         └─────────────────┘              │
                                                          ▼
                                                ┌─────────────────┐
                                                │    LinkedIn     │
                                                │   (Posting)     │
                                                └─────────────────┘
```

---

## Updated Feature Specifications

### 1. Content Generation (AI-Assisted)
- **Function**: Generate draft posts, not publish
- **Process**: 
  1. User inputs topic
  2. AI generates 3-5 variations
  3. User edits and saves to drafts
  4. Manual review by Andrew
  5. One-click post via extension

### 2. Engagement Features (Suggestion-Based)
- **Function**: Suggest comments, not post them
- **Process**:
  1. Dashboard shows key connections' posts
  2. AI suggests 2-3 comment options
  3. User edits comment
  4. Copy to clipboard
  5. Manually paste on LinkedIn

### 3. Lindy Webhook Integration (Posting Layer)
- **Function**: Handle LinkedIn posting via Lindy automation
- **Features**:
  - Webhook triggers for post publishing
  - Webhook triggers for comment posting
  - Job status tracking
  - Error handling and retry logic

---

## Realistic Timeline

### Phase 1: MVP (4-5 weeks)
- Week 1-2: Setup and basic UI ✅
- Week 3-4: Content generation + drafts
- Week 5: Lindy webhook integration

### Phase 2: Voice Training (3-4 weeks)
- Week 6-7: Collect voice samples
- Week 8-9: Prompt engineering system

### Phase 3: Full Features (4-5 weeks)
- Week 10-11: Engagement dashboard
- Week 12-13: Analytics and optimization
- Week 14: Testing and refinement

**Total: 12-14 weeks** (with buffers)

---

## Key Risk Mitigations

### LinkedIn Compliance
- **Risk**: API restrictions
- **Mitigation**: Browser extension approach, manual actions only

### Voice Authenticity
- **Risk**: Generic AI content
- **Mitigation**: Start with prompt engineering, iterate based on feedback

### User Adoption
- **Risk**: Resistance to new workflow
- **Mitigation**: Gradual rollout, extensive training, show clear ROI

---

## Adjusted Success Metrics

### Realistic Goals
- **Content Volume**: 5-7 posts/week (not 10+)
- **Time Savings**: 50% reduction (not 70%)
- **Authenticity**: 75%+ score (not 85%+)
- **ROI Timeline**: 6 months (not 3)

### Measurement Approach
- Weekly content audits
- Time tracking comparisons
- Engagement rate analysis
- Authenticity surveys with Andrew

---

## Database Schema (Simplified)

```sql
-- Core tables only
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50)
);

CREATE TABLE content_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT,
  status VARCHAR(50), -- draft, approved, published
  ai_generated BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE connections (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  title VARCHAR(255),
  priority INTEGER,
  last_engagement DATE
);
```

---

## Implementation Priorities

### Must Have (MVP)
1. ✅ AI content generation
2. ✅ Draft management
3. ✅ Lindy webhook integration
4. ✅ Simple calendar view

### Should Have (Phase 2)
1. Voice training system
2. Engagement dashboard
3. Comment suggestions
4. Basic analytics

### Could Have (Phase 3)
1. Advanced analytics
2. A/B testing
3. Multi-user support
4. Mobile app

### Won't Have (Future)
1. Full automation
2. Multi-platform posting
3. Direct messaging features
4. Video content

---

## Next Steps

1. **Immediate Actions**:
   - Set up development environment ✅
   - Create basic UI structure ✅
   - Implement content generation MVP
   - Build simple browser extension

2. **Week 1 Goals**:
   - Working content generator
   - Draft saving functionality
   - Basic extension that can fill LinkedIn post

3. **Success Criteria for MVP Demo**:
   - Generate 5 posts in 10 minutes
   - Save and manage drafts
   - Post to LinkedIn via Lindy webhook
   - Maintain Andrew's voice style

---

*This updated PRD prioritizes compliance, realistic timelines, and achievable goals while maintaining the core value proposition of scaling Andrew's LinkedIn presence.*