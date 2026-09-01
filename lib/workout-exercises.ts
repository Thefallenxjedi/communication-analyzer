/**
 * Starter master exercise catalog for transcript → workout generation.
 * Replace with coach-provided list when available.
 */

export type WorkoutExercise = {
  id: string;
  name: string;
  purpose: string;
  timing: string;
  instructions: string;
  whenToUse: string;
  tags: string[];
};

export const WORKOUT_EXERCISES: WorkoutExercise[] = [
  {
    id: "campfire-beacon",
    name: "Daily Routine — Light the Campfire/Beacon",
    purpose:
      "Prevent rambling. Set your beacon before you speak. Say the compression campfire sentence up front.",
    timing: "4 minutes",
    whenToUse:
      "Default weekly rep for rambling, circling the point, or weak opens. Most sessions include this.",
    tags: ["rambling", "structure", "clarity", "compression"],
    instructions: `(2 mins) Light the Campfire/Beacon

1. Ask yourself: "If I had to communicate this in one sentence, what would I say?" Use a question from your last week at work.

2. Say the "campfire" in one sentence. No commas. Single breath. Examples:
→ "Leadership is about clarity not certainty."
→ "Risk is the rent you pay for growth."

3. This is your verbal home base. Speak freely for 60 seconds. When you lose your way, return to the campfire (repeat a word from your sentence).

Record that 60 seconds.`,
  },
  {
    id: "pre-speak-routine",
    name: "Pre-Speaking Routine",
    purpose:
      "Align mind, body, and intention before an important meeting or recording.",
    timing: "90 seconds",
    whenToUse:
      "Before podcasts, panels, exec reviews, or when the client hedges or rushes the open.",
    tags: ["preparation", "confidence", "hedging", "presence"],
    instructions: `(90 secs) Pre-Speaking Routine

Obviously Achievable Outcome (OAO) — 30 sec
Choose one simple, measurable thing you will accomplish. Example: "I will share the comparison quote."

Breathing — 60 sec
Choose one:
Box Breathing: Inhale (nose) 4 sec → hold 4 → exhale (mouth) 4 → hold 4.
OR Lion's Breathing: 2 sharp (nose) inhales → 1 long (mouth) exhale.

Write the OAO you will use this week, and which breath you chose.`,
  },
  {
    id: "one-sentence-stop",
    name: "The One-Sentence Stop",
    purpose:
      "Say a thought in one sentence, then sit in the silence and let the other person ask for more.",
    timing: "5 minutes",
    whenToUse:
      "When the client circles the point, over-explains, or cannot stop after the claim.",
    tags: ["rambling", "conciseness", "pause"],
    instructions: `Practice saying a single idea, then stopping and sitting in the silence.

1. Pick one work topic from this week.
2. Say it in one sentence — no qualifiers, no second clause.
3. Count to three in silence. Do not fill the pause.
4. Repeat with three different topics.

Write one sentence that felt hardest to stop after.`,
  },
  {
    id: "word-bank",
    name: "Word Bank Build",
    purpose:
      "Build a personal library of textured, high-impact language before you need it live.",
    timing: "10 minutes",
    whenToUse:
      "When the client reaches for the perfect word in the moment or vocabulary feels unorganized.",
    tags: ["wordPrecision", "vocabulary", "preparation"],
    instructions: `Build a personal library of textured language pulled from sources you admire.

1. Pick one article, podcast, or leader you respect.
2. Pull 5 phrases or single words that carry weight — not jargon, texture.
3. Write each with a one-line note on when you would use it.
4. Pick one and use it in a campfire sentence today.

Submit your list of 5 words/phrases.`,
  },
  {
    id: "length-check",
    name: "The Length Check",
    purpose:
      "Catch yourself mid-ramble and compress to the point in real time.",
    timing: "5 minutes",
    whenToUse:
      "When the client senses they are rambling but has no tool to fix it live.",
    tags: ["rambling", "selfMonitoring", "conciseness"],
    instructions: `A simple in-the-moment tool for catching yourself mid-ramble.

1. Record a 90-second answer to a work question.
2. On playback, mark the sentence where you had already made your point.
3. Re-record stopping at that sentence.
4. Note the phrase you will use to signal stop: "That's the point." or "I'll pause there."

Write your stop phrase and when you will use it this week.`,
  },
];

export function formatExerciseCatalogForPrompt(): string {
  return WORKOUT_EXERCISES.map(
    (ex) =>
      `### ${ex.id}: ${ex.name}
Purpose: ${ex.purpose}
Timing: ${ex.timing}
When to use: ${ex.whenToUse}
Tags: ${ex.tags.join(", ")}

Instructions:
${ex.instructions}`,
  ).join("\n\n---\n\n");
}

export function exerciseById(id: string): WorkoutExercise | undefined {
  return WORKOUT_EXERCISES.find((ex) => ex.id === id);
}
