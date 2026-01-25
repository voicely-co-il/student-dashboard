# Supabase Edge Functions

## Overview
Edge Functions running on Deno Deploy for serverless API endpoints.

## File Structure
```
functions/
├── teacher-chat/           # AI assistant for teachers
│   ├── index.ts           # Main handler (~100 lines)
│   └── _shared/           # Modular components
│       ├── types.ts       # Shared types & constants
│       ├── intents.ts     # Intent classification (Gemini)
│       ├── crm.ts         # Notion CRM operations
│       ├── calendar.ts    # Google Calendar operations
│       ├── transcripts.ts # Transcript search (pgvector)
│       ├── gemini.ts      # AI response generation
│       └── web-search.ts  # Perplexity search
├── search-transcripts/    # Semantic search API
├── generate-lesson-plan/  # AI lesson planning
└── ...
```

## Import Pattern (Deno)
```typescript
// Use relative imports with .ts extension
import { classifyIntent } from "./_shared/intents.ts";
import type { ClassifiedIntent } from "./_shared/types.ts";
```

## Deployment
```bash
supabase functions deploy <function-name> --project-ref jldfxkbczzxawdqsznze
```

## Environment Variables
Set secrets via: `supabase secrets set KEY=value`
- `GEMINI_API_KEY` - Google Gemini API
- `OPENAI_API_KEY` - OpenAI embeddings
- `NOTION_API_KEY` - Notion CRM
- `PERPLEXITY_API_KEY` - Web search
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Calendar
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` - Calendar

## Size Limits
- Main handler: ≤100 lines
- Helper modules: ≤300 lines
- Total function folder: ≤1,500 lines
