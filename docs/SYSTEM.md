# EliteSpeak Communication Analyzer — System Documentation

Shareable overview of product flow, settings, audience, markers, challenge types, and Gemini prompts.

**Live:** https://communication-analyzer-gamma.vercel.app  
**Repo:** https://github.com/Thefallenxjedi/communication-analyzer

---

## 1. Product summary

Free **audio-only** funnel that returns an AI **communication diagnosis** (Hormozi-style: clear, direct).

**Flow:** Landing → Kartra lead form → Record/Upload audio (30s–2 min) → Analyzing → Diagnosis page

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
| `NEXT_PUBLIC_THOUGHTS2WORDS_URL` | Diagnosis CTA link |
| `NEXT_PUBLIC_COACH_URL` | Coach CTA link |

**Default model:** `gemini-2.5-flash`  
**Fallbacks:** `gemini-2.5-flash-lite` → `gemini-2.5-flash` → `gemini-flash-latest`  
**API:** `POST /api/analyze` (multipart audio), `maxDuration` ~120s  
**Inputs:** MP3 / WAV / M4A + in-browser record  
**Leads:** collected via **Kartra** simplified opt-in (`kartra_optin_containerc20ad4d…` + `https://app.kartra.com/optin/fMPOVao42jZa`); app stores `ca_lead` in `sessionStorage` (`{ source: "kartra", at }`) after redirect back. Client must set Kartra thank-you redirect to **`/capture?step=capture`** (or `https://communication-analyzer-gamma.vercel.app/capture?step=capture`). Legacy `/?step=capture` still works.

---

## 4. Funnel phases & URLs

| Step | Path | Screen |
|------|------|--------|
| 1 | `/` | Landing — marketing + CTA |
| 2 | `/start` | Kartra opt-in embed |
| 3 | `/capture` | Record (Recommended) or Upload |
| 4 | `/analyzing` | Progressive loading |
| 5 | `/report` | Diagnosis (report kept in `sessionStorage`) |

URL updates as the user moves through the funnel (browser back/forward supported).  

---

## 5. Score markers (20)

See `STAT_IDS` / `STAT_LABELS` / `STAT_HINTS` in `lib/schema.ts`.

Scores **1–10** (higher = stronger). Overall ≈ average of 20 × 10 (0–100). Report UI groups markers into four sections (each with a section score /100), star ratings, and color coding.

---

## 6. Main challenge image types (9)

`rambling` · `fillers` · `pace` · `clarity` · `confidence` · `structure` · `energy` · `presence` · `generic`

Assets: `public/challenges/*.png`  
Title text is free-form from the model; `imageKey` picks the illustration.

---

## 7. Diagnosis output shape

- `overallScore`, `level`
- `mainChallenge` { title, summary (~5 sentences), imageKey }
- `minorChallenges`
- `stats` (20 markers)
- `solutionsCopy`
- `transcript`

---

## 8. Gemini prompts (source of truth: `lib/gemini.ts`)

Prompts are the full executive-coach `TRANSCRIBE_PROMPT` and `DIAGNOSIS_PROMPT` in `lib/gemini.ts` (20 markers, evidence-based, dual audio+transcript). Do not duplicate the full text here — edit that file.

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
