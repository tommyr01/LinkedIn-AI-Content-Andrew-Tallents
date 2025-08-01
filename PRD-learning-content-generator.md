# Product Requirements Document (PRD)

## 1. Executive Summary

**Primary Value Propositions**
- AI-powered content generation that _learns_ from historical performance.
- Retains authentic writing style while continuously optimising for engagement.
- Dramatically reduces time-to-publish for high-quality LinkedIn posts.

**Strategic Alignment**
- Extends the existing LinkedIn AI Content platform with a self-improving engine.
- Leverages current Supabase data stores – no external API approval required.

**Core Benefits**
- Higher engagement, lower editing effort, voice authenticity preserved.

**Success Definition**
- +30 % engagement lift, –50 % editing time, ≥90 % voice-match satisfaction.

---

## 2. Scope Definition

| | In-Scope | Out-of-Scope | Future Considerations |
| --- | --- | --- | --- |
| **Functionality** | Historical post analysis, performance-weighted prompt building, feedback loop, voice-profile UI | Direct LinkedIn posting, competitor analysis, multi-user collaboration | Competitor insights, multi-platform adaptation |

---

## 3. Target Market & User Analysis

### 3.1 Ideal Customer Profile (ICP)
Solo founders, thought-leaders and content managers who rely on LinkedIn for brand growth and need to automate authentic posting.

### 3.2 Primary Personas
1. **Thought Leader (Andrew)** – wants consistent, authentic, high-performing posts.
2. **Content Manager** – manages executive accounts, needs data-driven creation.

---

## 4. User Stories & Acceptance Criteria

> **US-01:** _As a thought leader I want the AI to analyse my top posts so future drafts follow proven patterns._

**Acceptance**: Analysis completes < 60 s and surfaces ≥5 style elements used in new drafts.

> **US-02:** _As a user I want the generator to preserve my authentic tone._

**Acceptance**: ≥85 % voice-match score during UAT.

---

## 5. Feature Specifications

### 5.1 Feature Hierarchy
| # | Feature | Priority | Complex. | Value |
|---|---|---|---|---|
| F1 | Historical Post Analysis Engine | Critical | High | 9/10 |
| F2 | Performance-Based Learning | Critical | Very High | 10/10 |
| F3 | Dynamic Voice Profile | High | Medium | 8/10 |
| F4 | Smart Prompt Engineering | Critical | High | 9/10 |

### 5.2 Functional Requirements
- Extract style patterns: sentence length, emojis, hashtags, etc.
- Rank engagement drivers: reaction rate, comment depth, reshares.
- Store aggregated insights in `voice_profiles` table.
- Use insights to build weighted prompts for `/api/content/generate-with-learning`.

---

## 6. Technical Architecture & Implementation

### 6.1 Stack
- **Frontend:** Next.js (existing)
- **Backend:** Supabase + Edge Functions
- **AI Services:** OpenAI GPT-4 (analysis) & Claude (generation)

### 6.2 Key Directories
```
src/app/api/analysis/*        # analysis routes
src/app/api/content/*         # generation route (learning)
src/components/voice-profile/ # new UI widgets
supabase/migrations/          # new SQL migrations
```

### 6.3 Database Schema
```sql
-- voice_profiles
CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  avg_post_length INTEGER,
  common_words JSONB,
  sentence_patterns JSONB,
  emoji_usage JSONB,
  hashtag_patterns JSONB,
  paragraph_structure TEXT[],
  list_usage_rate DECIMAL(3,2),
  question_usage_rate DECIMAL(3,2),
  top_performing_patterns JSONB,
  engagement_drivers JSONB,
  optimal_post_times JSONB,
  total_posts_analyzed INTEGER DEFAULT 0,
  last_analysis_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- post_analysis_results
CREATE TABLE post_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_urn TEXT NOT NULL REFERENCES linkedin_posts(urn),
  word_count INTEGER,
  sentence_count INTEGER,
  paragraph_count INTEGER,
  reading_time_seconds INTEGER,
  tone_analysis JSONB,
  emotion_scores JSONB,
  key_phrases TEXT[],
  engagement_score DECIMAL(5,2),
  virality_score DECIMAL(5,2),
  audience_fit_score DECIMAL(5,2),
  performance_drivers JSONB,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (post_urn) REFERENCES linkedin_posts(urn) ON DELETE CASCADE
);

-- generation_feedback
CREATE TABLE generation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL,
  post_urn TEXT REFERENCES linkedin_posts(urn),
  was_published BOOLEAN DEFAULT FALSE,
  final_engagement_score DECIMAL(5,2),
  edit_distance INTEGER,
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  applied_patterns JSONB,
  successful_patterns JSONB,
  failed_patterns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Project Plan

| Phase | Weeks | Deliverables |
| --- | --- | --- |
| **P1 – Foundation** | 1-2 | Schema, basic analysis API, minimal UI |
| **P2 – Learning Engine** | 3-5 | Pattern extraction, performance weighting, prompt builder |
| **P3 – Optimisation** | 6-7 | Feedback loop, dashboards, latency tuning |
| **P4 – Launch** | 8 | QA, docs, GA rollout |

---

## 8. KPIs
- **Voice Match Score:** ≥ 85 %
- **Generation Acceptance:** ≥ 70 %
- **Engagement Lift:** ≥ 30 % vs. baseline
- **Time-to-Publish:** ≤ 2 minutes

---

## 9. Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| API costs spike | M | H | caching, batch calls |
| Style extraction inaccurate | M | H | expand training set, refine patterns |
| Slow analysis on huge histories | M | M | background jobs, pagination |

---

## 10. Open Questions
1. GPT-4 vs Claude for best cost-to-quality ratio?
2. Minimum post count for reliable profile?
3. Privacy guidelines for storing style data?

---

_Stakeholder sign-off pending._
