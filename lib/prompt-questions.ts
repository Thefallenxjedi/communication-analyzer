const QUESTION_BANK = [
  "What was your last work meeting about — and what did you actually need from it?",
  "What's the biggest project you're working on right now, and why does it matter?",
  "Tell me about a time you had to explain something complicated to someone who didn't get it.",
  "What does a normal workday look like for you from start to finish?",
  "What's one decision you made recently at work, and how did you talk people through it?",
  "Describe the last time you had to give someone difficult feedback.",
  "What's the most interesting problem you're trying to solve in your career right now?",
  "If someone asked what you do for a living, how would you explain it in a minute?",
  "What's a win from the last month that you'd actually want to talk about?",
  "What's been taking up most of your mental energy this week — at work or in life?",
  "Walk me through a conversation that didn't go the way you wanted.",
  "What's something you're building or learning that nobody at work fully understands yet?",
] as const;

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = next[i];
    const b = next[j];
    if (a === undefined || b === undefined) continue;
    next[i] = b;
    next[j] = a;
  }
  return next;
}

export function pickPromptQuestions(count = 3): string[] {
  return shuffle([...QUESTION_BANK]).slice(0, count);
}
