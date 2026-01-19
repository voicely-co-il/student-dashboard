# Voicely Student Dashboard

## Project Overview
מערכת דשבורד לתלמידים של Voicely - מעקב והתקדמות בלמידת שפות באמצעות AI.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** TanStack Query (React Query)
- **Backend:** Supabase (Auth, Database, Storage)
- **Deployment:** Vercel

## Repository Info
- **GitHub:** https://github.com/voicely-co-il/student-dashboard
- **Vercel:** https://vercel.com/voicelys-projects-bd7b93d9/student-dashboard
- **Organization:** voicely-co-il

## Project Structure
```
src/
├── components/     # React components
│   └── ui/         # shadcn/ui components
├── hooks/          # Custom React hooks
├── integrations/   # External service integrations
│   └── supabase/   # Supabase client & types
├── lib/            # Utility functions
├── pages/          # Page components
└── App.tsx         # Main app component
```

## Environment Variables
Environment variables are stored in `.env` (local) and configured in Vercel for production.

**Required variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

**IMPORTANT:** Never commit API keys or secrets to the repository.

## Development Commands
```bash
npm install     # Install dependencies
npm run dev     # Start dev server (port 8080)
npm run build   # Production build
npm run preview # Preview production build
npm run lint    # Run ESLint
```

## RTL Support
The app is configured for RTL (Hebrew) by default:
- `<html lang="he" dir="rtl">`
- Font: Assistant (Google Fonts)

## Deployment
- Push to `main` branch triggers auto-deploy to Vercel
- Preview deployments for pull requests

## Related Projects
- **MAMA (Senior Dashboard):** /Users/mit/Documents/GitHub/MAMA/src
