export const INTRO_SESSION = 0;
export const FINAL_SESSION = 10;
export const WORK_SESSION_COUNT = 9;
export const SLOT_COUNT = WORK_SESSION_COUNT + 1;

export function isValidSessionNumber(n: number): boolean {
  return Number.isInteger(n) && n >= INTRO_SESSION && n <= FINAL_SESSION;
}

export function stageLabel(sessionNumber: number): string {
  if (sessionNumber <= INTRO_SESSION) return "Intro Call";
  if (sessionNumber >= FINAL_SESSION) return "Final Call";
  return `Session ${sessionNumber}`;
}

export type SeedTask = {
  sessionNumber: number;
  title: string;
  instructions: string;
  recordingRequired: boolean;
  reviewRequired: boolean;
};

export const PROGRAM_SEED_TASKS: SeedTask[] = [
  {
    sessionNumber: INTRO_SESSION,
    title: "BEFORE Video",
    instructions:
      "Record a baseline speaking sample — your before state. Speak as you would on a real call or presentation, about 60–90 seconds. This recording is used later for before/after comparison.",
    recordingRequired: true,
    reviewRequired: true,
  },
  {
    sessionNumber: FINAL_SESSION,
    title: "AFTER Video",
    instructions:
      "Record your after speaking sample — the same kind of clip as your BEFORE video. This is used for the before/after comparison at program completion.",
    recordingRequired: true,
    reviewRequired: true,
  },
  {
    sessionNumber: FINAL_SESSION,
    title: "Completion Review",
    instructions:
      "Joseph reviews BEFORE vs AFTER live, confirms progress, and closes the program. Coach: write completion notes here, then mark complete.",
    recordingRequired: false,
    reviewRequired: false,
  },
];

export const REMOVED_SEED_TITLES = ["speechmap report"];
