export type Phase = "landing" | "name" | "capture" | "analyzing" | "done";

export const PHASE_PATH: Record<Phase, string> = {
  landing: "/",
  name: "/start",
  capture: "/capture",
  analyzing: "/analyzing",
  done: "/report",
};

export function pathToPhase(pathname: string): Phase {
  const path = pathname.replace(/\/$/, "") || "/";
  switch (path) {
    case "/start":
      return "name";
    case "/capture":
      return "capture";
    case "/analyzing":
      return "analyzing";
    case "/report":
      return "done";
    default:
      return "landing";
  }
}

export function phaseToPath(phase: Phase): string {
  return PHASE_PATH[phase];
}
