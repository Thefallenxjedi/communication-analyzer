export const INTRO_SESSION = 0;
/** Default Final Call index when workSessionCount is 9. */
export const FINAL_SESSION = 10;
export const WORK_SESSION_COUNT = 9;
export const MIN_WORK_SESSION_COUNT = 1;
export const MAX_WORK_SESSION_COUNT = 20;
export const SLOT_COUNT = WORK_SESSION_COUNT + 1;

/** Intro + Sessions 1–N — live calls clients book (default N=9). */
export const LIVE_CALL_TOTAL = WORK_SESSION_COUNT + 1;
export const LIVE_CALL_SESSIONS = [
  INTRO_SESSION,
  ...Array.from({ length: WORK_SESSION_COUNT }, (_, i) => i + 1),
] as const;

export function normalizeWorkSessionCount(value: number | undefined | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return WORK_SESSION_COUNT;
  }
  const n = Math.round(value);
  return Math.min(MAX_WORK_SESSION_COUNT, Math.max(MIN_WORK_SESSION_COUNT, n));
}

export function finalSessionNumber(workSessionCount?: number | null): number {
  return normalizeWorkSessionCount(workSessionCount) + 1;
}

export function programSlots(workSessionCount?: number | null): number[] {
  const count = normalizeWorkSessionCount(workSessionCount);
  return [
    INTRO_SESSION,
    ...Array.from({ length: count }, (_, i) => i + 1),
    finalSessionNumber(count),
  ];
}

export function workAndFinalSlots(workSessionCount?: number | null): number[] {
  const count = normalizeWorkSessionCount(workSessionCount);
  return [
    ...Array.from({ length: count }, (_, i) => i + 1),
    finalSessionNumber(count),
  ];
}

export function liveCallSessions(workSessionCount?: number | null): number[] {
  const count = normalizeWorkSessionCount(workSessionCount);
  return [INTRO_SESSION, ...Array.from({ length: count }, (_, i) => i + 1)];
}

export function isFinalSession(
  sessionNumber: number,
  workSessionCount?: number | null,
): boolean {
  return sessionNumber === finalSessionNumber(workSessionCount);
}

export function isLiveCallSession(
  sessionNumber: number,
  workSessionCount?: number | null,
): boolean {
  return liveCallSessions(workSessionCount).includes(sessionNumber);
}

export function isValidSessionNumber(
  n: number,
  workSessionCount?: number | null,
): boolean {
  return (
    Number.isInteger(n) &&
    n >= INTRO_SESSION &&
    n <= finalSessionNumber(workSessionCount)
  );
}

export function isMiddleWorkSession(
  sessionNumber: number,
  workSessionCount?: number | null,
): boolean {
  const count = normalizeWorkSessionCount(workSessionCount);
  return (
    Number.isInteger(sessionNumber) &&
    sessionNumber >= 1 &&
    sessionNumber <= count
  );
}

export function stageLabel(
  sessionNumber: number,
  workSessionCount?: number | null,
): string {
  if (sessionNumber <= INTRO_SESSION) return "Intro Call";
  if (isFinalSession(sessionNumber, workSessionCount)) return "Final Call";
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
      "Record a baseline speaking sample on your phone or camera — your before state. Speak as you would on a real call or presentation, about 60–90 seconds. Upload the video to Google Drive (anyone with the link) or YouTube, then paste that link below.",
    recordingRequired: true,
    reviewRequired: true,
  },
];

export const REMOVED_SEED_TITLES = ["speechmap report"];

export const UNUSED_FINAL_SEEDS = ["after video", "completion review"];

export function attentionSessionNumber(
  tasks: {
    sessionNumber?: number;
    status: string;
    reviewRequired?: boolean;
  }[],
  workSessionCount?: number | null,
): number {
  const final = finalSessionNumber(workSessionCount);
  for (let n = INTRO_SESSION; n <= final; n++) {
    const list = tasks.filter((task) => (task.sessionNumber ?? INTRO_SESSION) === n);
    if (list.some((task) => task.status === "submitted")) {
      return n;
    }
    if (list.some((task) => task.status === "open")) return n;
    if (
      list.some(
        (task) => task.status !== "reviewed" && task.status !== "done",
      )
    ) {
      return n;
    }
    if (list.length === 0) return n;
  }
  return final;
}
