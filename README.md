# Communication Analyzer (EliteSpeak-style)

Free communication analysis report via a lead-gen funnel: landing → name/email (demo only) → analyze → colorful EliteSpeak report across **20 markers** scored **1–10**.

## Funnel

1. **Landing** — dark colorful CTA page
2. **Lead form** — name + email (stored in `sessionStorage` only; noop API — nothing is collected to a database)
3. **Analyzer** — record audio/video, YouTube, upload, or paste text (server Gemini key only — no API key UI)
4. **Loading** — progressive “checking your voice…” steps
5. **Report** — dark matching ranking dashboard + sentence timeline

## What you get

- Session overview + key observations
- All 20 markers with expandable coach detail
- Top 3 priority drills + 24-hour action plan
- Sentence timeline with word tags

## Limits

- Upload up to **5 minutes**; we **process the first 4 minutes**
- Soft daily rate limit per IP (default **20**/day) — override with `ANALYZE_DAILY_LIMIT`

## Stack

- Next.js App Router + TypeScript + Tailwind
- Google AI SDK (`@ai-sdk/google` + `ai`) + Gemini Flash
- FFmpeg.wasm (client) for video → audio + frame sampling
- Zod EliteSpeak report schema

## Setup

```bash
npm install
```

```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
ANALYZE_DAILY_LIMIT=20
```

```bash
npm run dev
```

## Deploy (Vercel)

Set `GOOGLE_GENERATIVE_AI_API_KEY` (and optionally `ANALYZE_DAILY_LIMIT`) in the project env, then:

```bash
npx vercel --prod
```

## Cost note

A few hundred short analyses/month on Gemini Flash is typically low tens of USD if you leave free tier. Track usage in Google AI Studio / Cloud billing.

## Inputs

- Record audio / video in-browser
- YouTube public URL
- Upload audio/video
- Paste transcript text

Always refer to the person as **Speaker** in coaching copy. Not a medical or clinical assessment.
