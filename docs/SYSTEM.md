# EliteSpeak Communication Analyzer — System Documentation

Shareable overview of product flow, settings, audience, markers, challenge types, and Gemini prompts.

**Live:** https://communication-analyzer-gamma.vercel.app  
**Repo:** https://github.com/Thefallenxjedi/communication-analyzer

---

## 1. Product summary

Free **audio-only** funnel that returns an AI **communication diagnosis** (Hormozi-style: clear, direct).

**Flow:** Landing → Kartra name/email → Record/Upload audio (30s–2 min) → Analyzing → Diagnosis page

**Analysis:** Gemini transcribes audio, then diagnoses using **transcript + audio** (words + tone/delivery).

---

## 2. Target users (“Who is this for?”)

- Job seekers
- Founders
- Sales professionals
- Managers
- Students
- Content creators
- Public speakers
- Consultants

Anyone who communicates for work (interviews, sales, presentations, meetings).

---

## 3. System settings / env

| Variable | Purpose |
|----------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Server Gemini key (required) |
| `ANALYZE_DAILY_LIMIT` | Soft per-IP daily analyses (default `20`) |
| `GOOGLE_GENERATIVE_AI_MODEL` | Optional model override (default `gemini-2.5-flash`) |
| `NEXT_PUBLIC_DIAGNOSIS_CALL_URL` | Result page CTAs (default: EliteSpeak diagnosis popup) |
| `MONGODB_URI` | Atlas connection string (DB name in path, e.g. `.../elitespeak?...`) |
| `ADMIN_PASSWORD` | Shared password for `/admin` analyses table |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (anonymous attempts + scores) |

**Convex (analytics):** After each successful diagnosis the API inserts one row into Convex `analyses` (anonymousId, overallScore, durationSec, level, mainFocus, createdAt). No email, no audio. If Convex is unset or insert fails, the user still gets their report. Setup: `npx convex dev` → copy URL into `.env.local` / Vercel.

**Admin:** Visit `/admin`, enter `ADMIN_PASSWORD` — totals, last-14-days attempts, top repeat browsers, recent scores.

**Atlas setup (once):** Create free M0 cluster → DB user → Network Access allow `0.0.0.0/0` (for Vercel) → copy `mongodb+srv://…` URI with `/elitespeak` DB name → set `MONGODB_URI` + `ADMIN_PASSWORD` in `.env.local` and Vercel → redeploy.

**Default model:** `gemini-2.5-flash`  
**Fallbacks:** `gemini-2.5-flash-lite` → `gemini-2.5-flash` → `gemini-flash-latest`  
**API:** `POST /api/analyze` (multipart audio), `maxDuration` ~120s  
**Inputs:** MP3 / WAV / M4A + in-browser record  
**Leads (Kartra):** Home page embeds the Kartra opt-in form (`KartraOptIn`). Submit goes through Kartra; redirect back with `?step=capture` marks a session lead via `saveKartraLead()`. No Firebase / lead persistence API beyond the demo noop `POST /api/leads`.

---

## 4. Funnel phases & URLs

| Step | Path | Screen |
|------|------|--------|
| 1 | `/` | Landing — video + Kartra opt-in form |
| 2 | `/capture` | Record (Recommended) or Upload |
| 3 | `/analyzing` | Progressive loading |
| 4 | `/report` | Diagnosis (report kept in `sessionStorage`) |

Legacy `/start` redirects to `/#get-report`.  

**Leads:** Collected by **Kartra** embed. Funnel session uses `ca_lead` after redirect.

---

## 5. Score markers (Part A 15 + Part B 14)

See `PART_A_IDS` / `PART_B_IDS` / `STAT_LABELS` / `STAT_HINTS` in `lib/schema.ts`.

Scores **0–100** (higher = stronger). **Overall = average of Part A only** (15 main challenges). Part B is supporting diagnostics and is not averaged into overall.

Report UI:
- **Part A — Main Challenges** — four sections (Fluency, Content, Vocal, Certainty)
- **Part B — Supporting diagnostics** — four sections (Content depth, Emotional, Certainty & presence, Overall impression)

Main focus image = one Part A challenge (usually the priority / lowest).

---

## 6. Main challenge image types (15 + generic)

`selfMonitoring` · `blanking` · `rambling` · `clarity` · `structure` · `energy` · `wordPrecision` · `fillers` · `pace` · `pauseComfort` · `upspeak` · `hedging` · `conciseness` · `repetition` · `confidence` · `generic`

Assets: `public/challenges/*.png` (new challenges reuse closest existing art until dedicated assets are added).  
Title is taken from the catalog label for the chosen `imageKey`.

---

## 7. Diagnosis output shape

- `overallScore`, `level`
- `mainChallenge` { title, summary (~5 sentences), imageKey }
- `minorChallenges`
- `stats` (29 markers: 15 Part A + 14 Part B)
- `solutionsCopy`
- `transcript`

---

## 8. Gemini prompts (source of truth: `lib/gemini.ts`)

Prompts are the full executive-coach `TRANSCRIBE_PROMPT` and `DIAGNOSIS_PROMPT` in `lib/gemini.ts` (Part A + Part B markers, evidence-based, dual audio+transcript). Do not duplicate the full text here — edit that file.

After the prompt, the API also sends:

```
---
TRANSCRIPT:
{transcript}

---
Listen to the attached AUDIO for tone, pace, energy, confidence, pauses, and pitch variety. Score delivery from the audio; score wording from the transcript.
```

Plus the audio file attachment.

---

## 9. Out of scope (current)

- Resend email of report (planned later; needs domain for production)
- Video / YouTube / camera
- Real CRM / MongoDB lead storage
- Scientific pitch (Hz) measurement — LLM audio judgment only

---

## 10. Key files

| File | Role |
|------|------|
| `lib/gemini.ts` | Prompts + model IDs |
| `lib/schema.ts` | Markers, challenge keys, Zod report |
| `app/api/analyze/route.ts` | Transcribe → diagnose pipeline |
| `components/LandingPage.tsx` | Marketing + audience |
| `components/DiagnosisPage.tsx` | Result UI + CTAs |
| `docs/SYSTEM.md` | This document |
