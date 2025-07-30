# LinkedIn Content & Engagement Assistant

AI-powered tool to help Andrew's assistant create and manage LinkedIn content at scale while maintaining authentic voice and compliance with LinkedIn's terms of service.

## 🚀 Features

- **AI Content Generation**: GPT-4 powered content creation in Andrew's authentic voice
- **Airtable Integration**: Real-time data sync with your existing Airtable base
- **Lindy Webhooks**: Automated LinkedIn posting through Lindy automation
- **Professional Dashboard**: Clean, responsive interface built with shadcn/ui
- **Voice Training**: Prompt engineering to maintain Andrew's communication style
- **Content Calendar**: Visual scheduling and planning
- **Real-time Analytics**: Track post performance and engagement

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Database**: Airtable
- **AI**: OpenAI GPT-4
- **Automation**: Lindy webhooks for LinkedIn posting
- **Deployment**: Vercel

## 🔧 Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Airtable
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_TABLE_ID=your_airtable_table_id

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Lindy Webhooks
LINDY_WEBHOOK_URL=https://your-lindy-webhook-url.com
LINDY_WEBHOOK_TOKEN=your_lindy_webhook_token
```

### 2. Installation

```bash
pnpm install
```

### 3. Development

```bash
pnpm dev
```

### 4. Production Build

```bash
pnpm build
```

## 📊 Airtable Schema

The application expects the following Airtable table structure:

### Content Posts Table
- **Post ID** (Primary Key)
- **Content** (Long Text)
- **Post Type** (Single Select: Thought Leadership, Tips, Story, Question, Announcement)
- **Status** (Single Select: Draft, Review, Approved, Published)
- **Hashtags** (Multiple Select)
- **Scheduled Date** (Date/Time)
- **Created By** (Single Select: Andrew, Erska, AI Assistant)
- **Views** (Number)
- **Likes** (Number)
- **Comments** (Number)
- **Created** (Date/Time)

## 🤖 AI Content Generation

The system uses OpenAI GPT-4 with custom prompts to generate content in Andrew's voice:

- **Voice Characteristics**: Professional but approachable, leadership-focused, uses personal anecdotes
- **Content Types**: Thought leadership, tips, stories, questions, announcements
- **Quality Control**: Voice scoring system to maintain authenticity
- **Multiple Variations**: Generates 3-5 options per request

## 🔗 Lindy Integration

Posts are published to LinkedIn through Lindy webhooks:

1. User clicks "Post to LinkedIn"
2. Webhook triggered to Lindy
3. Lindy handles LinkedIn posting
4. Status updates returned to dashboard

## 📈 Key Metrics

- **Goal**: 5-7 posts per week
- **Time Savings**: 50% reduction in content creation time
- **Authenticity**: 75%+ voice matching score
- **Engagement**: Track likes, comments, and views

## 🔒 Security & Compliance

- **LinkedIn ToS Compliant**: Uses official APIs and manual approval workflow
- **Data Security**: Environment variables for sensitive data
- **No Automation**: All posting requires human approval
- **Audit Trail**: Full logging of all content generation and posting

## 📱 User Interface

### Dashboard
- Real-time stats from Airtable
- Recent posts overview
- Quick access to content creation

### Content Creation
- AI-powered content generation
- Multiple variation options
- Voice score feedback
- One-click saving to Airtable

### Content Management
- Draft management
- Approval workflow
- Scheduling capabilities
- Performance tracking

## 🚀 Deployment

The application is configured for automatic deployment to Vercel:

1. Push to GitHub repository
2. Vercel automatically builds and deploys
3. Environment variables configured in Vercel dashboard
4. Custom domain can be configured

## 📝 Usage

1. **Generate Content**: Enter a topic and select post type
2. **Review Options**: Choose from AI-generated variations
3. **Save to Airtable**: Content automatically synced
4. **Review & Approve**: Andrew reviews in Airtable
5. **Schedule & Post**: Use Lindy webhooks to publish

## 🤝 Contributing

This is a private project built specifically for Andrew Tallents' LinkedIn automation needs.

## 📄 License

Private - All rights reserved

---

*Built with ❤️ by Claude Code*# Trigger redeploy to c90a796
