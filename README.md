# EliteSpeak Communication Analyzer

Free audio → AI **diagnosis** funnel (mobile-first).

## Flow

1. Landing → **Get My Free Communication Report**
2. Name gate (demo / `sessionStorage`)
3. Upload audio **or** record audio (30 seconds to 2 minutes)
4. Analyzing
5. Diagnosis: main challenge, minor challenges, where you rank, Thoughts2Words / Coach CTAs, solutions copy

## Setup

```bash
npm install
```

```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
ANALYZE_DAILY_LIMIT=20

# Optional CTA destinations
# NEXT_PUBLIC_THOUGHTS2WORDS_URL=https://...
# NEXT_PUBLIC_COACH_URL=https://...
```

```bash
npm run dev
```

## Stack

- Next.js App Router + Tailwind
- Gemini via `@ai-sdk/google`
- Audio only (MP3 / WAV / M4A + browser recording)

Not a clinical assessment.
