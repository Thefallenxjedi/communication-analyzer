---
name: elitespeak-design
description: >-
  Applies the EliteSpeak Verbal Workout visual identity (void, gold, parchment,
  Playfair Display, ember) to the paid coaching client UI. Use when designing
  or styling /client, client login, Intro Call, Sessions 1–9, task states,
  reviews, or when the user mentions design-skill, Verbal Workout look, or
  EliteSpeak client design.
---

# EliteSpeak client design skill

Source: Sam Nebel × EliteSpeak Verbal Workout brief. Use this for the **paid coaching client** (`/client`, `/client/login`) — not the free analyzer funnel.

The funnel stays white / red / yellow. Do not mix the two products.

## The pitch (how it should feel)

The coach wrote the program. This UI is what the client actually runs.

Open it, go to one place, do one thing. The app keeps status and pacing. It remembers where they are. Review is a clear moment — not a note that trails off under a player.

Discipline over decoration. One screen live at a time. Spend boldness only on the ember and on the completed review.

## Color

| Token | Hex | Use |
| --- | --- | --- |
| `void` | `#141210` | Page background — near-black, warm-toned |
| `void-2` | `#1c1912` | Card / sidebar surface |
| `void-3` | `#221e16` | Inputs, nested wells |
| `parchment` | `#ede4cc` | Primary text |
| `parchment-dim` | `#b3a98d` | Secondary text |
| `gold` | `#c9a968` | Structure — dividers, labels, active nav, rings |
| `ember` | `#c1622f` | Signature accent only — ember visual and completion marks |

Near-black + gold is the EliteSpeak identity. Do not introduce teal, red, or highlighter yellow on the client product.

## Type

| Role | Face | Use |
| --- | --- | --- |
| Display | **Playfair Display** | Headings only — same serif family as “VERBAL WORKOUT”. Sparing. |
| Body | **Inter** | Quiet explaining: instructions, comments, nav labels |
| Instrument | **IBM Plex Mono** | Scores, timers, day counts — reads like an instrument, not a headline |

Load from Google Fonts or local files. Do not use the funnel’s DM Sans on client screens.

## Layout

Left bar + one main screen. Same shell everywhere.

**Left bar**

- Intro Call
- Session 1 … Session 9
- Meeting link
- Log out

Numbering is real sequence, not decoration. Highlight **you are here**. Active item uses gold. Only one nav item is selected.

**Main**

One place at a time. Calm even when a session has several tasks. No long stacked program dump.

Phone: same nav, horizontal or stacked above the screen. Do not invent a second product.

## Signature — the Ember

One pulsing circle. Behavior changes with state. Everything else stays quiet so this reads as intentional.

| State | Ember |
| --- | --- |
| Task in play | Dormant quiet gold ring |
| In review | Slow steady pulse — waiting, stay here |
| Reviewed | Ember completion mark — used once, not all over the page |
| Breathing / timed work (later) | Circle *is* the breath: expand, hold, contract |

Do not put embers on every card. One on the live screen.

## Client screens (our purpose)

### Login

Void page. Playfair wordmark. Email + continue. Temporary dummy login copy stays quiet.

### Intro Call

Selected in the bar. Overview in parchment on void-2. Same written sections the coach saved. Empty: one dim line — not written yet.

### Session — three task states

**1 · In play** (`open`)

Title, instructions, record, Submit. Ember is the quiet gold ring. Client is working.

**2 · In review** (`submitted`)

Recording locked. Status **In review**. Ember slow pulse. No delete, no re-record. The screen should feel paused, not empty.

**3 · Reviewed** (`reviewed`) — the important screen

The review *is* the screen:

- Score `/10` in IBM Plex Mono, large
- Coach comment in Inter
- Recording to replay, after the review
- Ember as the completion mark

Do not bury score and comment under the audio.

Empty / not ready session: “Your coach will assign this soon.” No fake ember activity.

## What not to do

- Do not restyle `/admin` or the free analyzer with this palette
- Do not add Bookends / Campfire / Pre-Speak as product features unless asked — those are the original workout tool, not our session model
- Do not use teal buttons, white marketing cards, or YouTube-red CTAs on `/client`
- Do not decorate idle sessions
- Do not split coaching onto another domain

## Apply

1. Tokens and fonts first (CSS variables on the client shell)
2. Left bar + main already exist — paint that structure
3. Then the three task states, review last and loudest
4. Ember only on the live task
