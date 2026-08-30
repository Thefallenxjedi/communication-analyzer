import { FINAL_SESSION } from "@/lib/coaching-program";

export type WaitMotion =
  | "ring"
  | "silence"
  | "dense"
  | "sharp"
  | "metronome"
  | "metronome-slow"
  | "count"
  | "wide"
  | "still"
  | "hold";

export type SessionWait = {
  theme: string;
  line: string;
  motion: WaitMotion;
};

const WAITING: Record<number, SessionWait> = {
  1: {
    theme: "Clarity of thought",
    line: "Name the thought before you dress it.",
    motion: "ring",
  },
  2: {
    theme: "Comfort with self",
    line: "Comfort is a silence you can stay inside.",
    motion: "silence",
  },
  3: {
    theme: "Texture & articulacy",
    line: "Texture is the word that was already yours.",
    motion: "dense",
  },
  4: {
    theme: "Sharpen the line",
    line: "Sharpen the last word. Leave the rest.",
    motion: "sharp",
  },
  5: {
    theme: "Reps & reviews",
    line: "Repetition is how the voice becomes inevitable.",
    motion: "metronome",
  },
  6: {
    theme: "Reps & reviews",
    line: "Again. Cleaner than yesterday.",
    motion: "metronome-slow",
  },
  7: {
    theme: "Reps & reviews",
    line: "The work is the reps. Stay in the room.",
    motion: "count",
  },
  8: {
    theme: "Toward the capstone",
    line: "You are closer to the voice you meant.",
    motion: "wide",
  },
  9: {
    theme: "The last mile",
    line: "Hold the standard. The last mile is quiet.",
    motion: "still",
  },
  [FINAL_SESSION]: {
    theme: "Program completion",
    line: "Leave with a voice that does not borrow.",
    motion: "hold",
  },
};

export function sessionWaiting(sessionNumber: number): SessionWait {
  return WAITING[sessionNumber] ?? WAITING[1];
}

export function isBarMotion(motion: WaitMotion): boolean {
  return (
    motion === "metronome" ||
    motion === "metronome-slow" ||
    motion === "count"
  );
}
