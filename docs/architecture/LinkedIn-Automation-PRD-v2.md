# Product Requirements Document: LinkedIn Automation Tool v2
**Andrew Tallents Build - Next Phase Development**

---

## 1. Executive Summary

### Primary Value Propositions
- **🔹 10x Efficiency Gain:** Reduce assistant's manual LinkedIn work from 40 hours/month to <10 hours while maintaining quality engagement
- **🔹 Intelligent Lead Prioritization:** Automatically identify and score high-value prospects based on ICP matching and real-time engagement signals
- **🔹 Consistent Brand Voice:** AI-powered content generation that maintains Andrew's authentic leadership coaching voice across all touchpoints
- **🔹 Data-Driven Optimization:** Real-time performance metrics to continuously improve content strategy and engagement tactics
- **🔹 Scalable Growth Engine:** Enable business expansion without proportional increase in operational overhead

### Strategic Alignment
This tool directly supports Andrew's goal of building a 7-figure coaching business by automating repetitive tasks while preserving the high-touch, personalized approach that drives conversions. It aligns with the broader strategy of leveraging AI to scale personal brand impact without sacrificing authenticity.

### Core Benefits
- **For Andrew:** More time for high-value coaching activities; data-driven insights into what content resonates; automated lead qualification
- **For Assistant (Urska):** Elimination of repetitive tasks; focus on strategic engagement; clear performance metrics
- **For the Business:** Reduced operational costs; increased lead flow; improved conversion tracking from LinkedIn to Circle community

### Success Definition
- Assistant time reduced by 75% within 3 months
- 2x increase in qualified lead identification
- 30% improvement in engagement rates on LinkedIn posts
- 50% reduction in time-to-response for high-value prospects

---

## 2. Scope Definition

### In Scope
- **🔹 LinkedIn Content Generation:** AI-powered post creation with multiple variations
- **🔹 Engagement Automation:** Semi-automated commenting on influencer posts with human oversight
- **🔹 Lead Research & Scoring:** Automated prospect analysis and ICP matching
- **🔹 Performance Analytics:** Real-time tracking of post performance and engagement metrics
- **🔹 Influencer Management:** Tracking and engaging with top 50 industry influencers
- **🔹 Assistant Dashboard:** Unified interface for all LinkedIn activities
- **🔹 Tone of Voice Training:** Custom AI model training on Andrew's content (Phase 2)

### Out of Scope
- **🔹 WhatsApp Integration:** Deferred to future phase
- **🔹 Multi-platform Posting:** Focus solely on LinkedIn for now
- **🔹 Full Marketing Automation:** Not replacing email marketing or other channels
- **🔹 Direct LinkedIn API Integration:** Using scraping/third-party tools initially
- **🔹 Automated DM Campaigns:** Maintaining personal touch for direct messages

### Future Considerations
- WhatsApp Business API integration for warm outreach
- Cross-platform content distribution (Twitter/X, Instagram)
- Advanced AI voice cloning for video content
- Integration with CRM systems (HubSpot/Salesforce)
- Automated webinar promotion workflows

---

## 3. Current State Analysis

### 3.1 Application Architecture
**Technology Stack:**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Serverless Functions
- **Database:** Currently mock data (transitioning to Prisma + PostgreSQL)
- **AI Integration:** OpenAI GPT-4 API
- **Deployment:** Vercel

### 3.2 Implemented Features

#### ✅ Content Generation Module (`/dashboard/content`)
- **Status:** Functional with basic AI integration
- **Capabilities:** 
  - Topic input → 3 AI-generated post variations
  - Basic post type selection (Thought Leadership, Tips, Story, etc.)
  - Copy-to-clipboard functionality
- **Current Limitations:** Generic AI voice, no persistence, no scheduling

#### ✅ Engagement Hub (`/dashboard/engagement`)
- **Status:** UI complete, using mock data
- **Capabilities:**
  - Display of influencer posts
  - Comment generation interface
  - Basic engagement metrics
- **Current Limitations:** No real data feed, no actual posting capability

#### ✅ Connections Manager (`/dashboard/connections`)
- **Status:** UI complete, mock data only
- **Capabilities:**
  - Connection list with search/filter
  - Engagement score visualization
  - Tag management
- **Current Limitations:** No database persistence, no lead scoring logic

#### ✅ Analytics Dashboard (`/dashboard/analytics`)
- **Status:** UI shell with mock metrics
- **Current Limitations:** No real data integration

### 3.3 Technical Debt & Gaps
1. **No persistent data layer** - all data is hardcoded/mocked
2. **No authentication system** - single-user assumption
3. **No real LinkedIn data ingestion** - manual process required
4. **Generic AI responses** - no tone customization
5. **No webhook/automation infrastructure** - all actions are manual

---

## 4. Target Market & User Analysis

### 4.1 Primary Users

#### User Persona 1: Virtual Assistant (Urska)
- **Role:** LinkedIn Content & Engagement Manager
- **Experience:** 2-3 years in social media management
- **Technical Proficiency:** Comfortable with web tools, basic understanding of AI
- **Goals:** Efficiently manage Andrew's LinkedIn presence, demonstrate value through metrics
- **Pain Points:** Repetitive manual tasks, difficulty tracking ROI, time zone differences
- **Usage Pattern:** 2-3 hours daily, peak usage 9am-12pm EST

#### User Persona 2: Business Owner (Andrew)
- **Role:** CEO Coach & Thought Leader
- **Experience:** 20+ years executive experience
- **Technical Proficiency:** Moderate; prefers simple, effective tools
- **Goals:** Scale influence without losing authenticity, identify high-value leads
- **Pain Points:** Time constraints, maintaining consistent presence, lead qualification
- **Usage Pattern:** Weekly review of metrics, occasional content approval

### 4.2 Ideal Customer Profile (ICP) for Andrew's Services
- **Company Size:** 200-5000 employees
- **Role:** CEO, P&L Owner, C-Suite Executive
- **Tenure:** Recently appointed (< 6 months) or facing transition
- **Industry:** Technology, Professional Services, Manufacturing
- **Geography:** US, UK, Western Europe
- **Challenges:** Leadership transition, scaling challenges, cultural transformation

---

## 5. User Stories & Acceptance Criteria

### 5.1 Content Creation Flow
**Story:** "As Urska, I want to quickly generate LinkedIn posts from podcast highlights so that I can maintain daily posting consistency"

**Acceptance Criteria:**
- Can input podcast topic/quote and generate 3 variations in < 30 seconds
- Each variation maintains professional tone and includes relevant hashtags
- Can edit generated content before posting
- System saves all generated content for future reference

### 5.2 Influencer Engagement Flow
**Story:** "As Urska, I want to see new posts from our top 50 influencers and quickly engage with relevant content"

**Acceptance Criteria:**
- Dashboard shows posts from last 24 hours from tracked influencers
- Can generate contextual comment in < 10 seconds
- Can track which posts have been engaged with
- System alerts for high-priority engagement opportunities

### 5.3 Lead Research Flow
**Story:** "As Andrew, I want to instantly know if someone engaging with my content fits our ICP so I can prioritize responses"

**Acceptance Criteria:**
- One-click research on any LinkedIn profile
- Returns ICP match score (0-100) with reasoning
- Highlights key factors (role, tenure, company size)
- Saves lead data for future reference

---

## 6. Feature Specifications

### 6.1 Phase 1: Core Functionality (Current Sprint)

#### Feature 1.1: Database Layer Implementation
**Priority:** Critical  
**Complexity:** Moderate  
**Details:**
- Implement Prisma ORM with PostgreSQL
- Create schemas for: Influencers, Posts, Leads, Generated Content
- Set up data migration scripts
- Implement basic CRUD operations

#### Feature 1.2: Influencer Post Ingestion
**Priority:** Critical  
**Complexity:** Complex  
**Details:**
- Build scraping service using Firecrawl
- Create `/api/influencers/fetchLatest` endpoint
- Implement rate limiting and error handling
- Store posts with metadata (author, timestamp, engagement metrics)

#### Feature 1.3: Lead Scoring Engine
**Priority:** High  
**Complexity:** Moderate  
**Details:**
- Define scoring algorithm based on ICP criteria
- Implement webhook-triggered automation flow combining:
  - Firecrawl for LinkedIn profile scraping
  - Perplexity for broader web research
  - LinkedIn search for additional professional details
- Create `/api/research/webhook` endpoint to receive automation results
- Calculate and store lead scores in database

#### Feature 1.4: Generic AI Integration
**Priority:** High  
**Complexity:** Simple  
**Details:**
- Refactor content generation to use generic professional tone
- Implement comment generation endpoint
- Add basic quality checks for AI output

### 6.2 Phase 2: Advanced Features (Next Sprint)

#### Feature 2.1: Andrew's Voice Model
**Priority:** High  
**Complexity:** Complex  
**Details:**
- Collect and process 100+ examples of Andrew's content
- Implement OpenAI Assistants API with Retrieval
- Fine-tune generation prompts
- A/B test output quality

#### Feature 2.2: Automated Engagement Workflows
**Priority:** Medium  
**Complexity:** Complex  
**Details:**
- Build webhook infrastructure for real-time triggers
- Implement engagement rules engine
- Create approval queue for automated actions
- Add safety controls and rate limits

#### Feature 2.3: Advanced Analytics
**Priority:** Medium  
**Complexity:** Moderate  
**Details:**
- Integrate LinkedIn Analytics API (or scraping equivalent)
- Build custom dashboards for KPIs
- Implement trend analysis and recommendations
- Create exportable reports

---

## 7. Technical Architecture & Implementation

### 7.1 System Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[Dashboard UI]
        B[Content Generator]
        C[Engagement Hub]
        D[Analytics View]
    end
    
    subgraph "API Layer"
        E[/api/content/*]
        F[/api/influencers/*]
        G[/api/research/*]
        H[/api/analytics/*]
    end
    
    subgraph "External Services"
        I[OpenAI GPT-4]
        J[Automation Platform]
        K[Cron Jobs]
    end
    
    subgraph "Research Automation Flow"
        L[Firecrawl Scraper]
        M[Perplexity Search]
        N[LinkedIn Search]
    end
    
    subgraph "Data Layer"
        O[Prisma ORM]
        P[(PostgreSQL)]
    end
    
    A --> E
    B --> E
    C --> F
    C --> G
    D --> H
    
    E --> I
    F --> I
    G --> J
    
    J --> L
    J --> M  
    J --> N
    
    E --> O
    F --> O
    G --> O
    H --> O
    
    O --> P
    K --> F
```

### 7.2 Database Schema

```sql
-- Core Tables
CREATE TABLE influencers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    profile_url VARCHAR(500) UNIQUE NOT NULL,
    company VARCHAR(255),
    role VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE influencer_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID REFERENCES influencers(id),
    linkedin_post_id VARCHAR(255),
    content TEXT,
    posted_at TIMESTAMP,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    scraped_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    profile_url VARCHAR(500) UNIQUE NOT NULL,
    role VARCHAR(255),
    company VARCHAR(255),
    tenure_months INTEGER,
    score INTEGER DEFAULT 0,
    score_factors JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50), -- 'post' or 'comment'
    topic TEXT,
    variations JSONB,
    selected_variation TEXT,
    posted BOOLEAN DEFAULT FALSE,
    performance_metrics JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_influencer_posts_date ON influencer_posts(posted_at DESC);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_generated_content_type ON generated_content(type);
```

### 7.3 API Endpoints

#### Content Generation
- `POST /api/content/generate` - Generate post variations
- `POST /api/content/comment` - Generate comment for a post
- `GET /api/content/history` - Retrieve past generated content
- `PUT /api/content/{id}/metrics` - Update performance metrics

#### Influencer Management
- `GET /api/influencers` - List all tracked influencers
- `POST /api/influencers` - Add new influencer
- `DELETE /api/influencers/{id}` - Remove influencer
- `POST /api/influencers/fetch-posts` - Trigger post scraping
- `GET /api/influencers/posts` - Get recent posts from all influencers

#### Lead Research
- `POST /api/research/trigger` - Trigger research automation for a LinkedIn profile
- `POST /api/research/webhook` - Receive results from research automation
- `GET /api/leads` - List all researched leads
- `PUT /api/leads/{id}` - Update lead information
- `GET /api/leads/hot` - Get high-score leads

---

## 8. Detailed Task Breakdown & Planning

### 8.1 Development Tasks by Sprint

#### Sprint 1: Foundation (Week 1-2)
| Task ID | Title | Description | Effort | Priority |
|---------|-------|-------------|--------|----------|
| T-001 | Setup Prisma & Database | Configure PostgreSQL, create schemas, migrations | L | Critical |
| T-002 | Build Influencer CRUD API | Create endpoints for managing influencer list | M | Critical |
| T-003 | Setup Research Automation Flow | Configure external automation with Firecrawl, Perplexity, LinkedIn search | M | Critical |
| T-004 | Create Lead Scoring Logic | Implement ICP matching algorithm and webhook handlers | M | High |
| T-005 | Wire Engagement Hub to Real Data | Replace mock data with database queries | M | High |
| T-006 | Add Research Button & Flow | Implement one-click lead research | M | High |

#### Sprint 2: AI Enhancement (Week 3-4)
| Task ID | Title | Description | Effort | Priority |
|---------|-------|-------------|--------|----------|
| T-007 | Collect Andrew's Content Samples | Gather 100+ posts, podcasts excerpts | S | High |
| T-008 | Setup OpenAI Assistants API | Configure retrieval-augmented generation | L | High |
| T-009 | Implement Voice-Matched Generation | Update content generation with custom model | M | High |
| T-010 | A/B Testing Framework | Compare generic vs custom AI output | M | Medium |
| T-011 | Comment Quality Scoring | Implement feedback mechanism | S | Medium |

#### Sprint 3: Automation & Analytics (Week 5-6)
| Task ID | Title | Description | Effort | Priority |
|---------|-------|-------------|--------|----------|
| T-012 | Build Webhook Infrastructure | Setup event-driven automation | L | Medium |
| T-013 | Create Engagement Rules Engine | Define automatic response criteria | M | Medium |
| T-014 | Implement Analytics Data Pipeline | Collect and process performance metrics | L | Medium |
| T-015 | Build Custom Analytics Dashboards | Create role-specific views | M | Medium |
| T-016 | Add Export & Reporting Features | Generate PDF/CSV reports | S | Low |

### 8.2 Resource Requirements
- **Development:** 1 Full-stack Developer (160 hours)
- **AI/ML:** Consultation for voice model training (20 hours)
- **QA:** Testing and validation (40 hours)
- **Infrastructure:** Vercel Pro, PostgreSQL hosting, API credits (~$200/month)

---

## 9. KPIs & Success Metrics

### 9.1 Efficiency Metrics
- **Time Saved:** Hours reduced in manual LinkedIn tasks (target: 30 hrs/month)
- **Content Velocity:** Posts per week (target: 5-7)
- **Response Time:** Average time to engage with influencer posts (target: < 2 hours)

### 9.2 Engagement Metrics
- **Post Reach:** Average impressions per post (target: +50% in 3 months)
- **Engagement Rate:** Likes + comments / impressions (target: > 5%)
- **Comment Response Rate:** Responses to our comments (target: > 20%)

### 9.3 Business Impact Metrics
- **Lead Generation:** Qualified leads identified per month (target: 20+)
- **Lead Quality:** Average lead score (target: > 70/100)
- **Conversion Rate:** Leads → Circle Community (target: > 10%)
- **ROI:** Revenue attributed to LinkedIn / Tool cost (target: > 10x)

---

## 10. Testing & Quality Assurance Strategy

### 10.1 Testing Phases
1. **Unit Testing:** API endpoints, scoring algorithms
2. **Integration Testing:** End-to-end workflows
3. **AI Quality Testing:** Output relevance and tone matching
4. **User Acceptance Testing:** With Urska on real tasks
5. **Performance Testing:** Response times, concurrent users

### 10.2 Quality Benchmarks
- API response time < 2 seconds
- AI generation accuracy > 90% (human review)
- Zero data loss in scraping operations
- 99.9% uptime for critical features

---

## 11. Deployment & Rollout Plan

### 11.1 Phase 1: Alpha (Week 1-2)
- Deploy to staging environment
- Internal testing with mock data
- Core feature validation

### 11.2 Phase 2: Beta (Week 3-4)
- Limited production deployment
- Urska begins using for real tasks
- Daily feedback collection
- Iterate based on usage patterns

### 11.3 Phase 3: Production (Week 5+)
- Full deployment with all features
- Performance monitoring
- Weekly optimization cycles
- Monthly feature releases

---

## 12. Risks, Dependencies & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LinkedIn changes anti-scraping measures | High | Medium | Use multiple scraping services; implement fallbacks |
| AI generates inappropriate content | High | Low | Human review queue; content filters; safety prompts |
| OpenAI API costs exceed budget | Medium | Medium | Implement caching; use GPT-4-mini for non-critical tasks |
| Urska resistant to new workflow | High | Low | Involve in design process; gradual rollout; training |
| Database scaling issues | Medium | Low | Start with managed PostgreSQL; plan for sharding |

---

## 13. Open Questions & Decisions Needed

| ID | Question | Owner | Due Date | Status |
|----|----------|-------|----------|---------|
| Q1 | Preferred method for LinkedIn authentication? | Tommy | Week 1 | Open |
| Q2 | Budget ceiling for AI API costs? | Andrew | Week 1 | Open |
| Q3 | Specific ICP scoring weights? | Andrew | Week 2 | Open |
| Q4 | Backup plan if scraping blocked? | Tommy | Week 2 | Open |
| Q5 | Integration with existing Circle community? | James | Week 3 | Open |

---

## 14. Next Immediate Actions

1. **Today:** Finalize database schema and run migrations
2. **Tomorrow:** Implement basic influencer CRUD operations
3. **This Week:** Complete Sprint 1 foundation tasks
4. **Next Week:** Begin AI voice collection and training
5. **Two Weeks:** Beta deployment with Urska

---

## 15. Appendix

### 15.1 Technical Resources
- [Firecrawl API Documentation](https://docs.firecrawl.dev)
- [OpenAI Assistants Guide](https://platform.openai.com/docs/assistants)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference)

### 15.2 Related Documents
- Original Meeting Transcript (Nov 2024)
- Initial PRD v1
- Technical Architecture Diagrams
- Andrew's Content Style Guide (to be created)

### 15.3 Contact Information
- **Product Owner:** Tommy Richardson
- **Technical Lead:** Tommy Richardson
- **Business Stakeholder:** Andrew Tallents
- **End User:** Urska (Assistant)

---

*Document Version: 2.0*  
*Last Updated: January 2025*  
*Next Review: After Sprint 1 Completion* 