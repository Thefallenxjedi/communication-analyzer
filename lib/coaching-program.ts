export const INTRO_SESSION = 0;
/** Default Final Call index when workSessionCount is 9. */
export const FINAL_SESSION = 10;
export const WORK_SESSION_COUNT = 9;
export const MIN_WORK_SESSION_COUNT = 1;
export const MAX_WORK_SESSION_COUNT = 20;

export const PROGRAM_SLOTS = programSlots(WORK_SESSION_COUNT);

/** Live coaching calls the client can book (Intro + work sessions). Default program. */
export const LIVE_CALL_TOTAL = WORK_SESSION_COUNT + 1;
export const LIVE_CALL_SESSIONS = liveCallSessions(WORK_SESSION_COUNT);

export const PRIVATE_SESSION_BOOK_URL =
  process.env.NEXT_PUBLIC_PRIVATE_SESSION_URL?.trim() ||
  "https://calendly.com/contact-josephtsar/elitespeak-private-session";

export function normalizeWorkSessionCount(value: number | undefined | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return WORK_SESSION_COUNT;
  }
  const n = Math.round(value);
  return Math.min(MAX_WORK_SESSION_COUNT, Math.max(MIN_WORK_SESSION_COUNT, n));
}

/** Final Call session number for a given work-session count. */
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

/** Work sessions + Final (no Intro). Matches coachingSessions:listForClient. */
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

export function sessionFileToken(
  sessionNumber: number,
  workSessionCount?: number | null,
): string {
  if (sessionNumber <= INTRO_SESSION) return "INTRO_CALL";
  if (isFinalSession(sessionNumber, workSessionCount)) return "FINAL_CALL";
  return `SESSION_${sessionNumber}`;
}

export function sessionLabel(
  sessionNumber: number,
  workSessionCount?: number | null,
): string {
  if (sessionNumber <= INTRO_SESSION) return "Intro Call + Session 1";
  if (isFinalSession(sessionNumber, workSessionCount)) return "Final Call";
  return `Session ${sessionNumber}`;
}

export function sessionHeadline(
  sessionNumber: number,
  workSessionCount?: number | null,
): string {
  if (sessionNumber <= INTRO_SESSION) {
    return "Intro Call + Session 1 (Milestone 1: Baseline Established)";
  }
  if (isFinalSession(sessionNumber, workSessionCount)) {
    return "Final Call (Milestone 11: Program Completion)";
  }
  return `Session ${sessionNumber}`;
}

export function sessionMilestoneLine(
  sessionNumber: number,
  workSessionCount?: number | null,
): string {
  if (sessionNumber <= INTRO_SESSION) return "Milestone 1: Baseline Established";
  if (isFinalSession(sessionNumber, workSessionCount)) {
    return "Milestone 11: Program Completion";
  }
  return "";
}

export function currentStageLabel(
  sessionNumber: number,
  workSessionCount?: number | null,
): string {
  return sessionLabel(sessionNumber, workSessionCount);
}

export function parseCurrentStage(
  stage: string | undefined,
  workSessionCount?: number | null,
): number {
  if (!stage || stage === "Intro Call" || stage === "Intro Call + Session 1") {
    return INTRO_SESSION;
  }
  if (stage === "Final Call") return finalSessionNumber(workSessionCount);
  const match = /^Session\s+(\d+)$/.exec(stage);
  if (!match) return INTRO_SESSION;
  const n = Number(match[1]);
  return isValidSessionNumber(n, workSessionCount) ? n : INTRO_SESSION;
}

/** Intro Call and Session 1 share one portal/admin destination without renumbering data. */
export function groupedProgramSession(sessionNumber: number): number {
  return sessionNumber <= 1 ? INTRO_SESSION : sessionNumber;
}

/** Admin may assign ahead. The client can work a session only after the previous one is done. */
export function isClientSessionUnlocked(
  sessionNumber: number,
  currentStage: string | undefined,
  workSessionCount?: number | null,
): boolean {
  return sessionNumber <= parseCurrentStage(currentStage, workSessionCount);
}

export function previousProgramSession(
  sessionNumber: number,
  workSessionCount?: number | null,
): number {
  const count = normalizeWorkSessionCount(workSessionCount);
  const final = finalSessionNumber(count);
  if (sessionNumber <= 1) return INTRO_SESSION;
  if (sessionNumber >= final) return count;
  return sessionNumber - 1;
}

/** Admin transcript panel: summary for the call just completed, tasks for the next session. */
export function transcriptWorkoutDefaults(
  workspaceSession: number,
  workSessionCount?: number | null,
): {
  summarySession: number;
  tasksSession: number;
} {
  const count = normalizeWorkSessionCount(workSessionCount);
  const final = finalSessionNumber(count);
  if (workspaceSession === INTRO_SESSION) {
    return { summarySession: 1, tasksSession: Math.min(2, final) };
  }
  if (workspaceSession >= count) {
    return { summarySession: workspaceSession, tasksSession: final };
  }
  return { summarySession: workspaceSession, tasksSession: workspaceSession + 1 };
}

export function fileToken(value: string): string {
  const token = value
    .normalize("NFKD")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return token || "FILE";
}

export function extFromContentType(type: string | null | undefined): string {
  const raw = (type || "").split(";")[0]?.trim().toLowerCase() || "";
  if (raw === "audio/webm" || raw === "video/webm") return "webm";
  if (raw === "audio/mpeg" || raw === "audio/mp3") return "mp3";
  if (raw === "audio/wav" || raw === "audio/x-wav" || raw === "audio/wave") {
    return "wav";
  }
  if (raw === "audio/mp4" || raw === "video/mp4") return "m4a";
  if (raw === "audio/ogg" || raw === "audio/opus") return "ogg";
  if (raw === "application/pdf") return "pdf";
  return "webm";
}

/** USER_NAME_SESSION_ABOUT.ext — e.g. Sourabh_INTRO_CALL_BEFORE_Video.webm */
export function recordingDownloadName(input: {
  clientName: string;
  sessionNumber: number;
  about: string;
  ext: string;
  workSessionCount?: number | null;
}): string {
  const user = fileToken(input.clientName);
  const session = sessionFileToken(input.sessionNumber, input.workSessionCount);
  const about = fileToken(input.about);
  const ext = input.ext.replace(/^\./, "") || "webm";
  return `${user}_${session}_${about}.${ext}`;
}
