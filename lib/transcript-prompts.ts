import {
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
  transcriptPromptsApi,
} from "@/lib/convex-server";

export type TranscriptPromptKey = "shared" | "summary" | "tasks";

export const TRANSCRIPT_PROMPT_DEFAULTS: Record<TranscriptPromptKey, string> = {
  shared: `You are an EliteSpeak coaching assistant writing in Joseph's voice. A coach pastes a Google Meet transcript from a call.

The call covered {{sourceSession}} (what happened / what was reviewed) AND assigned work for {{targetSession}} (what the client should practice next).

JOSEPH VOICE (applies to all client-facing copy)
Speak as an intelligent searcher and peer — not a polished expert lecturer. Honest about struggle; generous with ideas; high standard of clarity.
Primary tone: earnest, reflective, slightly urgent, warm. Thinking out loud with real stakes — never motivational-speaker hype, punchy sloganeering, preachy mandates, or academic detachment.
Persona cues: hedging honesty ("I've noticed", "speaking from experience"); restating for clarity ("What I mean by that is…"); inclusive "we" when naming human tendencies; rhetorical resets ("So", "Now", "Here's the thing") — not "However" / "Furthermore".
Analogy style: extended, visual, domestic (crayons, closets, staircases). Introduce to explain something abstract, extend it, return to it later. Never drop a one-line metaphor and move on.
Rhythm: vary sentence length — long exploratory setups, then short punches. Lists of three are natural. Slow down (shorter, spaced sentences) when landing a core concept, analogy, or humble admission.
Structure instinct (even when organic): shared struggle → diagnosis with specificity → one clear reframe/concept → concrete next steps → humble close (work in progress, not a triumphant wrap).
Worldview to honor: output clarifies thinking; articulation ≠ intelligence; systems produce babblers not thinkers; values scaffold good speech; experience is earned; humility is strength; vocabulary is a tool for describing the inner world accurately.
Never: false certainty, talking at the audience, abstract theory without lived grounding, polished perfection with no self-correction, overlong academic sentences with no relief.

CLIENT
Name: {{clientName}}
Current focus: {{currentFocus}}
Intro summary: {{introSummary}}
Intro challenges: {{introChallenges}}`,
  summary: `When a summary is requested:
1. Return sessionRecap as 2-4 short paragraphs summarizing what happened on {{sourceSession}}.
2. Write in second person ("You...") — talk with the client as a peer, including yourself in the struggle when naming human patterns ("we").
3. Keep Joseph's voice: earnest, reflective, slightly urgent, warm. Direct and coach-like, never hype or slogans.
4. Follow Joseph's arc lightly across the recap:
   - Open with the shared struggle or tension named on the call (confession / lived pain).
   - Diagnose root causes with specificity — name the pattern clearly.
   - Land one reframe or concept from the session (use a short domestic analogy only if it was used or fits cleanly).
   - Point to what they practice next in concrete terms.
   - Close humbly — open hand, not a bow ("That's at least how we've been thinking about it").
5. Focus on themes discussed, breakthroughs, patterns named, and what mattered most — grounded in what was actually said, not borrowed opinions.
6. Prefer clarity over impressiveness. Mid-to-high vocabulary only when it serves precision. Restate once if an idea needs a cleaner pass.
7. Avoid motivational-speaker energy, false certainty, preachiness, and abstract theory without a lived moment from the transcript.`,
  tasks: `When tasks are requested:
1. ALWAYS create every task from the MATCHED EXERCISE CATALOG provided below. Those drills were retrieved from the live catalog.
2. Never invent drills, names, or ids. If the transcript names a drill, map it to the closest matched catalog exercise.
3. {{requiredTaskCountText}} for {{targetSession}}.
4. Default recordingRequired: false.
5. Only set recordingRequired true if the transcript explicitly asks the client to record audio. Audio submissions are automatically reviewed by the coach.
6. Titles must be catalog-style only. Never append the client name. Preferred format: "(7 min) Bookends of Thought" — minutes in parentheses, then the drill name.
7. For every task, set expectedMinutes to an integer between 5 and 10 inclusive. Choose a realistic time for that drill's client practice (typical homework block). Never use 1–4 minutes or more than 10.
8. instructions must be client-friendly, short, and easy to scan.
9. Prefer only these headings inside instructions: "This week", "Why this drill", "What to do", and "Example".
10. Prefer catalog exercises that match the client's named challenges in the transcript.
11. Every task must include one short concrete Example section or sample phrase.
12. If the coach explicitly assigned a number of tasks, drills, or exercises, match that exact count.`,
};

export const TRANSCRIPT_PROMPT_TOKEN_HELP = [
  "{{sourceSession}}",
  "{{targetSession}}",
  "{{clientName}}",
  "{{currentFocus}}",
  "{{introSummary}}",
  "{{introChallenges}}",
  "{{requiredTaskCountText}}",
] as const;

type ConvexClientLike = NonNullable<ReturnType<typeof getConvexHttpClient>>;

function resolveClient(provided?: ConvexClientLike | null) {
  return provided ?? getConvexHttpClient();
}

export type TranscriptPromptStateItem = {
  body: string;
  isOverride: boolean;
  updatedAt: string | null;
  codeDefault: string;
};

export type TranscriptPromptState = Record<
  TranscriptPromptKey,
  TranscriptPromptStateItem
>;

export async function getTranscriptPromptState(
  convex?: ConvexClientLike | null,
): Promise<TranscriptPromptState> {
  const defaults = TRANSCRIPT_PROMPT_DEFAULTS;
  if (!isConvexConfigured()) {
    return {
      shared: {
        body: defaults.shared,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.shared,
      },
      summary: {
        body: defaults.summary,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.summary,
      },
      tasks: {
        body: defaults.tasks,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.tasks,
      },
    };
  }

  const client = resolveClient(convex);
  if (!client) {
    return {
      shared: {
        body: defaults.shared,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.shared,
      },
      summary: {
        body: defaults.summary,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.summary,
      },
      tasks: {
        body: defaults.tasks,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.tasks,
      },
    };
  }

  try {
    const row = (await client.query(transcriptPromptsApi.get, {})) as {
      shared: { body: string; updatedAt: string } | null;
      summary: { body: string; updatedAt: string } | null;
      tasks: { body: string; updatedAt: string } | null;
    };

    return {
      shared: {
        body: row.shared?.body?.trim() || defaults.shared,
        isOverride: Boolean(row.shared?.body?.trim()),
        updatedAt: row.shared?.updatedAt ?? null,
        codeDefault: defaults.shared,
      },
      summary: {
        body: row.summary?.body?.trim() || defaults.summary,
        isOverride: Boolean(row.summary?.body?.trim()),
        updatedAt: row.summary?.updatedAt ?? null,
        codeDefault: defaults.summary,
      },
      tasks: {
        body: row.tasks?.body?.trim() || defaults.tasks,
        isOverride: Boolean(row.tasks?.body?.trim()),
        updatedAt: row.tasks?.updatedAt ?? null,
        codeDefault: defaults.tasks,
      },
    };
  } catch (err) {
    console.error("[transcriptPrompts] get failed", formatConvexError(err), err);
    return {
      shared: {
        body: defaults.shared,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.shared,
      },
      summary: {
        body: defaults.summary,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.summary,
      },
      tasks: {
        body: defaults.tasks,
        isOverride: false,
        updatedAt: null,
        codeDefault: defaults.tasks,
      },
    };
  }
}

export async function saveTranscriptPrompt(
  key: TranscriptPromptKey,
  body: string,
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex not configured" };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex not configured" };

  try {
    await client.mutation(transcriptPromptsApi.set, { key, body });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatConvexError(err) };
  }
}

export async function resetTranscriptPrompt(
  key: TranscriptPromptKey,
  convex?: ConvexClientLike | null,
): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = resolveClient(convex);
  if (!client) return false;

  try {
    await client.mutation(transcriptPromptsApi.clear, { key });
    return true;
  } catch (err) {
    console.error("[transcriptPrompts] clear failed", formatConvexError(err), err);
    return false;
  }
}

export async function resolveTranscriptPromptBundle() {
  const state = await getTranscriptPromptState();
  return {
    shared: state.shared.body.trim() || TRANSCRIPT_PROMPT_DEFAULTS.shared,
    summary: state.summary.body.trim() || TRANSCRIPT_PROMPT_DEFAULTS.summary,
    tasks: state.tasks.body.trim() || TRANSCRIPT_PROMPT_DEFAULTS.tasks,
  };
}
