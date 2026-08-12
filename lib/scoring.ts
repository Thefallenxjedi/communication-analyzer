import type {
  ChallengeImageKey,
  DiagnosisReport,
  DiagnosisStat,
  StatId,
} from "./schema";
import {
  CHALLENGE_IMAGE_KEYS,
  CHALLENGE_LABELS,
  PART_A_IDS,
  PART_A_SECTIONS,
  PART_B_SECTIONS,
  STAT_IDS,
  STAT_LABELS,
} from "./schema";

export function scoreLabel(overall: number): string {
  if (overall >= 90) return "Elite Communicator";
  if (overall >= 78) return "Strong Communicator";
  if (overall >= 65) return "Effective Communicator";
  if (overall >= 52) return "Developing Communicator";
  if (overall >= 38) return "Inconsistent Communicator";
  return "Needs Significant Improvement";
}

/** Clamp a marker score to 0–100. */
export function coerceScore100(raw: number, legacyScale = false): number {
  if (!Number.isFinite(raw)) return 50;
  let score = Math.round(raw);
  if (legacyScale) score *= 10;
  return Math.min(100, Math.max(0, score));
}

/** Map old marker ids (pre Part A/B) onto the current catalog. */
const LEGACY_STAT_MAP: Record<string, StatId> = {
  verbalorangecones: "complexLanguage",
  cognitiveload: "mentalEffort",
  overexplaining: "talkingPastPoint",
  fillerworddensity: "fillers",
  filler: "fillers",
  calm: "steadiness",
  pausequality: "pauseComfort",
  presence: "pauseComfort",
  certaintyratio: "decisiveness",
  anxietylevel: "visibleNervousness",
  rambletriggerwords: "rambleTriggers",
  assertivenessold: "assertiveness",
};

function remapStatId(raw: string): StatId | null {
  if ((STAT_IDS as readonly string[]).includes(raw)) return raw as StatId;
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const id of STAT_IDS) {
    if (id.toLowerCase() === compact) return id;
  }
  return LEGACY_STAT_MAP[compact] ?? null;
}

/** Overall = mean of Part A (15 main challenges) only. */
export function deriveOverallFromStats(stats: DiagnosisStat[]): number {
  const partA = stats.filter((s) =>
    (PART_A_IDS as readonly string[]).includes(s.id),
  );
  const pool = partA.length ? partA : stats;
  if (!pool.length) return 0;
  const avg = pool.reduce((sum, x) => sum + x.score, 0) / pool.length;
  return Math.round(avg);
}

/** Section score 0–100 from average of that section's marker scores */
export function sectionScore(
  stats: DiagnosisStat[],
  ids: readonly StatId[],
): number {
  const byId = new Map(stats.map((s) => [s.id, s.score]));
  const scores = ids
    .map((id) => byId.get(id))
    .filter((n): n is number => typeof n === "number");
  if (!scores.length) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

type SectionDef = {
  id: string;
  title: string;
  blurb: string;
  ids: readonly StatId[];
};

export function buildStatSections(
  stats: DiagnosisStat[],
  sections: readonly SectionDef[] = PART_A_SECTIONS as unknown as readonly SectionDef[],
) {
  return sections
    .map((section) => {
      const ids = section.ids;
      const sectionStats = ids
        .map((id) => stats.find((s) => s.id === id))
        .filter((s): s is DiagnosisStat => Boolean(s))
        .sort((a, b) => b.score - a.score);
      return {
        ...section,
        stats: sectionStats,
        score: sectionScore(stats, ids),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildPartASections(stats: DiagnosisStat[]) {
  return buildStatSections(
    stats,
    PART_A_SECTIONS as unknown as readonly SectionDef[],
  );
}

export function buildPartBSections(stats: DiagnosisStat[]) {
  return buildStatSections(
    stats,
    PART_B_SECTIONS as unknown as readonly SectionDef[],
  );
}

const LEGACY_IMAGE_MAP: Record<string, ChallengeImageKey> = {
  presence: "pauseComfort",
  filler: "fillers",
  fillerwords: "fillers",
  overexplaining: "rambling",
  calm: "pauseComfort",
  assertiveness: "hedging",
  certainty: "hedging",
  verbaltic: "fillers",
  upspeaklanding: "upspeak",
  landing: "upspeak",
};

function coerceImageKey(raw: string): ChallengeImageKey {
  const trimmed = raw.trim();
  if ((CHALLENGE_IMAGE_KEYS as readonly string[]).includes(trimmed)) {
    return trimmed as ChallengeImageKey;
  }
  const compact = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const id of CHALLENGE_IMAGE_KEYS) {
    if (id.toLowerCase() === compact) return id;
  }
  if (LEGACY_IMAGE_MAP[compact]) return LEGACY_IMAGE_MAP[compact];
  return "generic";
}

function lowestPartAId(stats: DiagnosisStat[]): ChallengeImageKey {
  const partA = stats.filter((s) =>
    (PART_A_IDS as readonly string[]).includes(s.id),
  );
  if (!partA.length) return "generic";
  const lowest = [...partA].sort((a, b) => a.score - b.score)[0];
  return (lowest?.id as ChallengeImageKey) || "generic";
}

export function normalizeStats(
  raw: Array<{ id: string; label?: string; score: number }>,
): DiagnosisStat[] {
  // Models often still emit 1–10. If every present score is ≤10, treat as legacy
  // and ×10. A true all-markers-≤10 on a 0–100 scale is extremely rare; product
  // priority is fixing the common 1–10 case.
  const present = raw.filter((s) => Number.isFinite(s.score));
  const maxScore =
    present.length > 0 ? Math.max(...present.map((s) => s.score)) : 0;
  const legacyScale = present.length > 0 && maxScore <= 10;

  const byId = new Map<StatId, number>();
  for (const row of raw) {
    const id = remapStatId(String(row.id));
    if (!id) continue;
    // Prefer first occurrence; later duplicates ignored
    if (!byId.has(id)) {
      byId.set(id, coerceScore100(row.score, legacyScale));
    }
  }

  return STAT_IDS.map((id) => ({
    id,
    label: STAT_LABELS[id],
    score: byId.get(id) ?? 50,
  }));
}

export function normalizeDiagnosis(
  report: DiagnosisReport,
  transcriptFallback: string,
): DiagnosisReport {
  const stats = normalizeStats(report.stats);
  // Overall is always the average of Part A markers (0–100).
  const overall = deriveOverallFromStats(stats);
  let imageKey = coerceImageKey(report.mainChallenge.imageKey || "generic");
  if (imageKey === "generic") {
    imageKey = lowestPartAId(stats);
  }
  const catalogTitle = CHALLENGE_LABELS[imageKey];

  return {
    ...report,
    stats,
    overallScore: Math.min(100, Math.max(0, overall)),
    level: report.level?.trim() || scoreLabel(overall),
    transcript: report.transcript?.trim() || transcriptFallback,
    mainChallenge: {
      title:
        imageKey !== "generic"
          ? catalogTitle
          : report.mainChallenge.title?.trim() || catalogTitle,
      summary: report.mainChallenge.summary?.trim() || "",
      strengths:
        report.mainChallenge.strengths?.trim() ||
        "You showed up and shared a real sample — that gives us something concrete to work with.",
      improvements:
        report.mainChallenge.improvements?.trim() ||
        report.mainChallenge.summary?.trim() ||
        "Tighten one main habit so listeners grasp your point faster and with less effort.",
      imageKey,
    },
    minorChallenges:
      report.minorChallenges?.trim() ||
      "What worked: a few moments were easier to follow. What to improve: secondary gaps in pacing and structure still steal clarity — tighten those next.",
    solutionsCopy:
      report.solutionsCopy?.trim() ||
      "Keep the habits that already land. Then run 2–3 months of deliberate drills on your three weakest Part A challenges: one-take recordings, shorter answers, and pause practice under light pressure.",
  };
}

/** Lowest Part A markers by default (main scorecard). */
export function lowestStats(stats: DiagnosisStat[], n = 3): DiagnosisStat[] {
  const partA = stats.filter((s) =>
    (PART_A_IDS as readonly string[]).includes(s.id),
  );
  const pool = partA.length ? partA : stats;
  return [...pool].sort((a, b) => a.score - b.score).slice(0, n);
}

export type { StatId };
