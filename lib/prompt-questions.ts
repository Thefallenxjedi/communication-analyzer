/** Fixed speaking prompts shown before record/upload. */
export const PROMPT_QUESTIONS = [
  "What was the latest work meeting you had today?",
  "Can you describe the project you're currently working on?",
  "What's the last tough question someone asked you (in work or life), and what did you say back?",
] as const;

const QUESTION_BANK = [...PROMPT_QUESTIONS] as const;

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
  return shuffle([...QUESTION_BANK]).slice(0, Math.min(count, QUESTION_BANK.length));
}
