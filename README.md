# LinkedIn Content & Engagement Assistant

AI-powered tool to help Andrew's assistant create and manage LinkedIn content at scale while maintaining authentic voice and compliance with LinkedIn's terms of service.

## Project Structure

```
linkedin-automation/
├── apps/
│   ├── web/              # Next.js web application with shadcn/ui
│   └── extension/        # Chrome extension for LinkedIn posting
├── packages/
│   ├── ui/              # Shared UI components (shadcn/ui)
│   ├── ai/              # OpenAI integration and prompts
│   └── db/              # Supabase client and database utilities
└── docs/                # Project documentation
```

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4
- **Styling**: Tailwind CSS
- **Browser Extension**: Chrome Extension (Manifest V3)

## Key Features

1. **Content Generation**: AI-powered post creation in Andrew's voice
2. **Content Calendar**: Visual scheduling and planning
3. **Draft Management**: Save, edit, and organize content
4. **Analytics Dashboard**: Track post performance
5. **Comment Suggestions**: AI-generated engagement ideas
6. **Browser Extension**: One-click posting to LinkedIn

## Compliance

This tool is designed as an AI-assisted content creation platform, not a fully automated posting system. All LinkedIn interactions require user action through the browser extension to maintain compliance with LinkedIn's Terms of Service.

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

## License

Private - All rights reserved