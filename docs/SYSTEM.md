# EliteSpeak Communication Analyzer — System Documentation

Shareable overview of product flow, settings, audience, markers, challenge types, and Gemini prompts.

**Live:** https://communication-analyzer-gamma.vercel.app  
**Repo:** https://github.com/Thefallenxjedi/communication-analyzer

---

## 1. Product summary

Free **audio-only** funnel that returns an AI **communication diagnosis** (Hormozi-style: clear, direct).

**Flow:** Landing → Kartra lead form → Record/Upload audio (max 4 min) → Analyzing → Diagnosis page

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
**Leads:** collected via **Kartra** opt-in embed; app stores `ca_lead` in `sessionStorage` (`{ source: "kartra", at }`) after redirect back. Client must set Kartra thank-you redirect to `/?step=capture` (or absolute production URL with `?step=capture`).  

---

## 4. Funnel phases

1. **Landing** — marketing + CTA  
2. **Name gate** — Kartra embed (first name + email); posts to Kartra, then redirects back with `?step=capture`  
3. **Capture** — Record (Recommended) or Upload  
4. **Analyzing** — progressive loading messages  
5. **Diagnosis** — main/minor challenges, stats, solve CTAs, solutions  

---

## 5. Score markers (10)

| ID | Label | Primary signal |
|----|--------|----------------|
| `confidence` | Confidence | Audio delivery |
| `clarity` | Clarity | Transcript |
| `speakingPace` | Speaking Pace | Audio |
| `energy` | Energy | Audio |
| `structure` | Structure | Transcript |
| `vocabulary` | Vocabulary | Transcript |
| `conciseness` | Conciseness | Transcript |
| `engagement` | Engagement | Both |
| `fillerWords` | Filler Words | Audio + transcript |
| `presence` | Presence | Audio |

Scores **1–10** (higher = stronger). Overall ≈ average × 10 (0–100).

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
- `stats` (10 markers)
- `solutionsCopy`
- `transcript`

---

## 8. Gemini prompts (source of truth: `lib/gemini.ts`)

### 8.1 Transcribe prompt (`TRANSCRIBE_PROMPT`)

```
You are an expert speech transcription system.

Transcribe the provided audio accurately.
- Preserve natural sentence structure. Do not invent content.
- If unclear, use [unclear] rather than guessing.
- Prefer segments with startSec (seconds from start) and text.
- Also return the full concatenated transcript string.
- Only include speech from the primary Speaker.
```

### 8.2 Diagnosis prompt (`DIAGNOSIS_PROMPT`)

```
You are a direct communication diagnostician. Write like Alex Hormozi: clear, blunt, simple. No fluff. No therapy speak. No corporate coaching jargon.

You receive BOTH:
1) the AUDIO recording (listen to it), and
2) a TRANSCRIPT of the words.

You MUST use both. Do not score from transcript alone.

=== LISTEN TO THE AUDIO (tone & delivery) ===
From the sound of the voice, evaluate:
- Pace: rushed, dragging, uneven, or controlled
- Energy: flat/monotone vs lively/varied
- Confidence: hesitation, trailing-off, weak endings, shaky vs steady assertive delivery
- Pauses: purposeful silence vs awkward gaps or zero breathing room
- Fillers as SOUND: um/uh density and where they land
- Pitch variety: monotone vs natural ups/downs (rough judgment from audio — do not invent Hz numbers)
- Presence: does the voice sound like it owns the room, or shrinks / mumbles / fades

If the audio is unclear, say so briefly and lean more on transcript for word-based markers only — never invent delivery claims you cannot hear.

=== READ THE TRANSCRIPT (words) ===
From the text, evaluate:
- Clarity of ideas, structure, rambling, vocabulary, conciseness
- Filler words and hedges in the wording
- Engagement / storytelling in the content

=== REPORT RULES ===
- Write summary text in second person ("you").
- Do NOT invent quotes. Prefer evidence from transcript; describe delivery from what you hear.
- Higher scores (1–10) ALWAYS mean stronger performance.
- Pick ONE main challenge — the single biggest problem (words OR delivery) that, if fixed, moves the needle most.
- mainChallenge.summary must be about 5 sentences. Direct. Specific. Cover what they do, how it SOUNDS, why it costs them.
- mainChallenge.imageKey must be one of: rambling, fillers, pace, clarity, confidence, structure, energy, presence, generic
- minorChallenges: short paragraph on secondary lows (mix words + delivery when relevant).
- stats: exactly these 10 ids with labels and scores 1–10 — score delivery-heavy ones (confidence, speakingPace, energy, presence, engagement, fillerWords) using AUDIO first; score structure/vocabulary/conciseness/clarity using transcript first:
  confidence (Confidence), clarity (Clarity), speakingPace (Speaking Pace), energy (Energy),
  structure (Structure), vocabulary (Vocabulary), conciseness (Conciseness),
  engagement (Engagement), fillerWords (Filler Words), presence (Presence)
- overallScore: 0–100 from average of stats × 10
- level: plain label like "Strong Communicator" or "Inconsistent Communicator"
- solutionsCopy: Hormozi tone. ~2–3 months of consistent work. Practice routine + frameworks + pressure-testing. 3–5 sentences.
- transcript: return the transcript you used

Produce the diagnosis JSON now.
```

### 8.3 Extra user message (analyze route)

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
