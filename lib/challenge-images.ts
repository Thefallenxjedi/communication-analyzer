import type { ChallengeImageKey } from "@/lib/schema";
import { CHALLENGE_IMAGE_KEYS } from "@/lib/schema";

/** Same paths as on-screen ChallengeVisual. */
export const CHALLENGE_SRC: Record<ChallengeImageKey, string> = {
  selfMonitoring: "/challenges/presence.png",
  blanking: "/challenges/confidence.png",
  rambling: "/challenges/rambling.png",
  clarity: "/challenges/clarity.png",
  structure: "/challenges/structure.png",
  energy: "/challenges/energy.png",
  wordPrecision: "/challenges/clarity.png",
  fillers: "/challenges/fillers.png",
  pace: "/challenges/pace.png",
  pauseComfort: "/challenges/presence.png",
  upspeak: "/challenges/confidence.png",
  hedging: "/challenges/confidence.png",
  conciseness: "/challenges/structure.png",
  repetition: "/challenges/rambling.png",
  confidence: "/challenges/confidence.png",
  generic: "/challenges/generic.png",
};

export function challengeImagePath(imageKey: string): string {
  const key = (
    (CHALLENGE_IMAGE_KEYS as readonly string[]).includes(imageKey)
      ? imageKey
      : "generic"
  ) as ChallengeImageKey;
  return CHALLENGE_SRC[key];
}
