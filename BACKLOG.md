# Backlog

## YouTube: skip MP3 in Gemini when captions exist

**Status:** Backlog (not started)  
**Added:** 2026-08-25

### Problem

YouTube analysis is slow (~3–5 min) and expensive on long videos because we often send **both** the transcript **and** the downloaded MP3 to Gemini for scoring — even when captions are already good.

Production check (last 5 reports): all used the **full 29-marker audio scorecard**, so Gemini was getting audio. Same 12:39 clip varied wildly: ~67s / 32k tokens vs ~155s / 124k tokens on a heavier path (retries or extra calls).

### Current behavior

| Path | When | What Gemini gets |
|------|------|------------------|
| Full YouTube | Transcript + MP3 both succeed | Transcript + MP3 on diagnose (skips re-transcribe only) |
| Transcript-only fallback | MP3 / RapidAPI fails | Text only (~16 markers) |
| Audio-only | No captions, MP3 works | Transcribe from audio, then diagnose with audio |

Relevant code: `app/api/analyze/route.ts` — when `pastedTranscript.length >= 40`, we reuse captions but still pass `parts` (MP3) into `runDiagnosis`.

### Proposed change

When YouTube returns a solid transcript (≥40 chars), run **transcript-only diagnosis** — do not attach MP3 to the Gemini diagnose call. Keep MP3 download for duration validation and as fallback when captions fail.

### Expected impact

- Shorter gen time (target ~1–2 min vs ~3–5 min on long clips)
- Lower token cost
- Reports use text-only markers (no pace/energy/etc. from audio) — acceptable tradeoff when captions exist; UI already supports `transcriptOnly`

### Notes

- UX already sets 3–5 min expectation for YouTube; update copy if this ships
- Admin Gen column / estimates may shift after change

## Transcript to task (Verbal Workout automation)

**Status:** Shipped (v1)  
**Added:** 2026-08-31  
**Detail:** [feature-request/transcript-to-task.md](./feature-request/transcript-to-task.md)

Admin → client → Session N → **Generate from transcript**. Paste Meet transcript → Gemini drafts Session N−1 recap (client-visible) + Session N lesson tasks → coach edits → save. Starter exercise catalog in `lib/workout-exercises.ts` (replace when coach sends master list).
