import { PART_A_SECTIONS } from "@/lib/schema";

export type ProfileSectionInput = {
  id: string;
  title: string;
  score: number;
  stats: Array<{ id: string; label: string; score: number }>;
};

export type ProfileAxis = {
  id: string;
  label: string;
  score: number;
  sectionId: string;
};

export type ProfileOrderedSection = {
  id: string;
  title: string;
  score: number;
  stats: Array<{ id: string; label: string; score: number }>;
};

export const PROFILE_RING: Record<
  string,
  { fill: string; stroke: string; short: string; rgb: readonly [number, number, number] }
> = {
  aFluency: {
    fill: "#dbeafe",
    stroke: "#2563eb",
    short: "Fluency",
    rgb: [219, 234, 254],
  },
  aContent: {
    fill: "#dcfce7",
    stroke: "#16a34a",
    short: "Content",
    rgb: [220, 252, 231],
  },
  aVocal: {
    fill: "#fef9c3",
    stroke: "#ca8a04",
    short: "Delivery",
    rgb: [254, 249, 195],
  },
  aCertainty: {
    fill: "#ffe4e6",
    stroke: "#e11d48",
    short: "Presence",
    rgb: [255, 228, 230],
  },
};

export const PROFILE_RING_STROKE_RGB: Record<
  string,
  readonly [number, number, number]
> = {
  aFluency: [37, 99, 235],
  aContent: [22, 163, 74],
  aVocal: [202, 138, 4],
  aCertainty: [225, 29, 72],
};

export function orderProfileSections(
  sections: ProfileSectionInput[],
): ProfileOrderedSection[] {
  return PART_A_SECTIONS.map((def) => {
    const hit = sections.find((s) => s.id === def.id);
    return {
      id: def.id,
      title: def.title,
      score: hit?.score ?? 0,
      stats: (hit?.stats ?? []).slice().sort((a, b) => {
        const ia = (def.ids as readonly string[]).indexOf(a.id);
        const ib = (def.ids as readonly string[]).indexOf(b.id);
        return ia - ib;
      }),
    };
  }).filter((s) => s.stats.length > 0);
}

export function flattenProfileAxes(
  ordered: ProfileOrderedSection[],
): ProfileAxis[] {
  return ordered.flatMap((section) =>
    section.stats.map((stat) => ({
      ...stat,
      sectionId: section.id,
    })),
  );
}

export function focusSectionIdForKey(
  ordered: ProfileOrderedSection[],
  focusImageKey?: string,
): string | null {
  if (!focusImageKey || focusImageKey === "generic") return null;
  return (
    ordered.find((s) => s.stats.some((st) => st.id === focusImageKey))?.id ??
    null
  );
}

/** Band summary under the radar — positive when overall ≥ 80. */
export function profileBandSummary(
  overallScore: number | undefined,
  weakest: ProfileOrderedSection | undefined,
): string | null {
  if (overallScore != null && overallScore >= 80) {
    return "Strong across the board — no major gap to fix. Keep doing what already works.";
  }
  if (!weakest) return null;
  if (weakest.score >= 80) {
    return "Solid in every band — your relative softest area is still strong.";
  }
  const label = PROFILE_RING[weakest.id]?.short || weakest.title;
  return `Softest area: ${label}.`;
}

export function shortProfileLabel(label: string): string {
  const map: Record<string, string> = {
    "Self-Monitoring": "Self-mon.",
    Blanking: "Blanking",
    Rambling: "Rambling",
    "Filler Words": "Fillers",
    Clarity: "Clarity",
    Structure: "Structure",
    "Word Precision": "Precision",
    Conciseness: "Concise",
    Repetition: "Repetition",
    Energy: "Energy",
    "Pace Control": "Pace",
    "Pause Comfort": "Pauses",
    Upspeak: "Upspeak",
    Hedging: "Hedging",
    "Vocal Confidence": "Confidence",
  };
  return map[label] || (label.length > 10 ? `${label.slice(0, 9)}…` : label);
}

export function angleForIndex(i: number, n: number) {
  return -Math.PI / 2 + (i / n) * 2 * Math.PI;
}

export function polarAt(
  cx: number,
  cy: number,
  angleRad: number,
  r: number,
) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}
