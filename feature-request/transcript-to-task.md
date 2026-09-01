# Transcript to task

**Status:** Implemented (v1 — paste transcript, generate recap + lesson tasks)  
**Added:** 2026-08-31  
**Priority:** High — replaces Canva PDF Verbal Workouts

## Problem

Designing Verbal Workouts in Canva and sending PDFs is the biggest time sink. After each coaching call, the coach manually turns the conversation into session tasks. We already have Google Meet transcripts and a client portal with per-session tasks (record audio / self lesson).

## Goal

Admin pastes a call transcript for a client + session. Gemini (existing `GOOGLE_GENERATIVE_AI_API_KEY`) reads it against a **master exercise list** from the coach and auto-generates tasks that appear in the client portal — same shape as today (title, long instructions, record vs lesson, review required).

- If the call assigned three drills → three tasks.
- Exercises are picked from the master list (Campfire/Beacon, Pre-Speaking Routine, Landing Drill, etc.) with light personalization from what was discussed.
- Coach previews, edits, saves. No Canva. No PDF.

## How it fits the program

1. Client enrolls → LinkedIn PDF → Intro Call (before video + coach diagnosis).
2. Sessions 1–9: each session is a Verbal Workout (tasks).
3. After a call (e.g. reviewed Session 2, assign Session 3): coach opens **admin → client → Session 3**, pastes transcript, generates tasks for **that session**.
4. Client sees workouts in `/client`; completes tasks; coach scores recordings.

Client does **not** paste transcripts — admin only.

## Flow (shipped)

1. Admin: client detail → pick target session (e.g. Session 3 after Session 2 call).
2. **Generate from transcript** → paste Google Meet transcript.
3. API: `POST /api/admin/transcript-to-workout` — Gemini + `lib/workout-exercises.ts` catalog.
4. Preview: Session N−1 recap + Session N lesson tasks (`recordingRequired: false` by default).
5. Edit → **Save recap + add tasks** → Convex recap + existing `createTask` API.
6. Client sees recap on source session and tasks on target session in `/client`.

## Flow (original spec)

1. Admin: client detail → pick target session (usually next session after the call).
2. Paste Google Meet transcript + optional note (“this call assigns Session 3”).
3. API: Gemini + prompt (master exercise catalog + transcript + client context).
4. Return proposed tasks: `title`, `instructions`, `recordingRequired`, `reviewRequired`.
5. Admin preview → edit → confirm → `createTask` (existing Convex/API).
6. Client portal updates like Sample demo data today.

## Dependencies

- [ ] **Master exercise list** from coach (names, purpose, timing, full instructions, when to use, how to vary). Without this, the model invents drills.
- [ ] Confirm UX: generate into **selected session** (not always “next”).
- [ ] Reuse: `app/api/admin/tasks` POST, `coaching:createTask`, Gemini via `generateObject` (see `lib/linkedin-profile.ts`, `app/api/analyze/route.ts`).

## Out of scope (v1)

- Auto-fetch transcript from Google Meet API (paste-only first).
- Client-facing transcript upload.
- Bookends / Campfire / Pre-Speak as separate product features unless they are rows in the master list.

## What coach still does

| Coach | App |
| --- | --- |
| Run the call | Store client + sessions |
| Export / paste Meet transcript | Transcript → draft tasks |
| Skim draft, tweak a line | Show workout in portal |
| Score submissions | Session lock + review states |

## Open questions

- Where does master list live? (markdown in repo, admin-editable prompt addon, Convex table)
- One “Generate workout” button per session vs global on client page
- Store raw transcript on client/session for audit?

## What to ask the coach for

1. Every exercise name (Campfire/Beacon, Pre-Speaking Routine, Landing Drill, etc.).
2. For each: purpose, timing, full instructions as written in Canva today.
3. When you use it (week / challenge: rambling, hedging, slow open).
4. How you usually vary it per client (one or two examples).
5. Optional: sample transcript + the workout you sent after that call.
