export const INTRO_SESSION = 0;
export const FINAL_SESSION = 10;
export const WORK_SESSION_COUNT = 9;
export const PROGRAM_SLOTS = [
  INTRO_SESSION,
  ...Array.from({ length: WORK_SESSION_COUNT }, (_, i) => i + 1),
  FINAL_SESSION,
] as const;

export function isValidSessionNumber(n: number): boolean {
  return Number.isInteger(n) && n >= INTRO_SESSION && n <= FINAL_SESSION;
}

export function sessionFileToken(sessionNumber: number): string {
  if (sessionNumber <= INTRO_SESSION) return "INTRO_CALL";
  if (sessionNumber >= FINAL_SESSION) return "FINAL_CALL";
  return `SESSION_${sessionNumber}`;
}

export function sessionLabel(sessionNumber: number): string {
  if (sessionNumber <= INTRO_SESSION) return "Intro Call";
  if (sessionNumber >= FINAL_SESSION) return "Final Call";
  return `Session ${sessionNumber}`;
}

export function sessionHeadline(sessionNumber: number): string {
  if (sessionNumber <= INTRO_SESSION) {
    return "Intro Call (Milestone 1: Baseline Established)";
  }
  if (sessionNumber >= FINAL_SESSION) {
    return "Final Call (Milestone 11: Program Completion)";
  }
  return `Session ${sessionNumber}`;
}

export function sessionMilestoneLine(sessionNumber: number): string {
  if (sessionNumber <= INTRO_SESSION) return "Milestone 1: Baseline Established";
  if (sessionNumber >= FINAL_SESSION) return "Milestone 11: Program Completion";
  return "";
}

export function currentStageLabel(sessionNumber: number): string {
  return sessionLabel(sessionNumber);
}

export function parseCurrentStage(stage: string | undefined): number {
  if (!stage || stage === "Intro Call") return INTRO_SESSION;
  if (stage === "Final Call") return FINAL_SESSION;
  const match = /^Session\s+(\d+)$/.exec(stage);
  if (!match) return INTRO_SESSION;
  const n = Number(match[1]);
  return isValidSessionNumber(n) ? n : INTRO_SESSION;
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
}): string {
  const user = fileToken(input.clientName);
  const session = sessionFileToken(input.sessionNumber);
  const about = fileToken(input.about);
  const ext = input.ext.replace(/^\./, "") || "webm";
  return `${user}_${session}_${about}.${ext}`;
}
