import type {
  ChallengeImageKey,
  DiagnosisReport,
  DiagnosisStat,
  StatId,
} from "./schema";
import {
  CHALLENGE_IMAGE_KEYS,
  CHALLENGE_LABELS,
  HIGH_PERFORMER_THRESHOLD,
  PART_A_IDS,
  PART_A_SECTIONS,
  PART_B_SECTIONS,
  STAT_IDS,
  STAT_LABELS,
  TRANSCRIPT_ONLY_PART_A_SECTIONS,
  TRANSCRIPT_ONLY_PART_B_SECTIONS,
  TRANSCRIPT_PART_A_IDS,
  TRANSCRIPT_PART_B_IDS,
} from "./schema";
import { extractPatternQuotes, splitTranscriptSentences } from "./transcript-tags";

export function scoreLabel(overall: number): string {
  if (overall >= 90) return "Elite Communicator";
  if (overall >= 78) return "Strong Communicator";
  if (overall >= 65) return "Effective Communicator";
  if (overall >= 52) return "Developing Communicator";
  if (overall >= 38) return "Inconsistent Communicator";
  return "Needs Significant Improvement";
}

function stripDashes(value: string): string {
  return value.replace(/\s*[—–]\s*/g, ". ").replace(/\s{2,}/g, " ").trim();
}

function cleanQuote(raw: string): string {
  return raw
    .replace(/^[-•*\d.)\s]+/, "")
    .replace(/^["“'`]+|["”'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEvidenceQuotes(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\n+| \| /)
    .map(cleanQuote)
    .filter((q) => q.length >= 2)
    .slice(0, 3);
}

function quoteInTranscript(quote: string, transcript: string): boolean {
  const t = transcript.toLowerCase().replace(/\s+/g, " ");
  const q = quote.toLowerCase().replace(/\s+/g, " ").trim();
  if (!q || !t) return false;
  if (t.includes(q)) return true;
  // Allow short phrases if most content words appear nearby
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return t.includes(q);
  const hits = words.filter((w) => t.includes(w)).length;
  return hits >= Math.ceil(words.length * 0.7);
}

/** Build 1–3 trusted quotes for the main challenge (LLM → marker → transcript patterns). */
export function resolveMainEvidenceQuotes(input: {
  evidence?: string;
  imageKey: ChallengeImageKey;
  stats: DiagnosisStat[];
  transcript: string;
}): string[] {
  const transcript = input.transcript.trim();
  const fromModel = parseEvidenceQuotes(input.evidence || "").filter((q) =>
    quoteInTranscript(q, transcript),
  );

  const marker = input.stats.find((s) => s.id === input.imageKey);
  const fromMarker = marker?.example?.trim()
    ? [cleanQuote(marker.example)].filter(
        (q) => q.length >= 2 && quoteInTranscript(q, transcript),
      )
    : [];

  const patternIds: StatId[] =
    input.imageKey === "fillers" ||
    input.imageKey === "hedging" ||
    input.imageKey === "rambling"
      ? [input.imageKey === "rambling" ? "rambleTriggers" : input.imageKey]
      : input.imageKey === "generic"
        ? ["fillers", "hedging"]
        : [];

  const fromPatterns = patternIds.flatMap((id) =>
    extractPatternQuotes(transcript, id, 3),
  );

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const q of [...fromModel, ...fromMarker, ...fromPatterns]) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(q.length > 100 ? `${q.slice(0, 99).trimEnd()}…` : q);
    if (merged.length >= 3) break;
  }
  return merged;
}

function clipWords(text: string, maxWords = 12): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

const PATTERN_FOR_STAT: Partial<Record<StatId, StatId>> = {
  fillers: "fillers",
  hedging: "hedging",
  rambling: "rambleTriggers",
  rambleTriggers: "rambleTriggers",
};

/** Pull a short transcript snippet suitable as a marker example. */
function snippetForStat(id: StatId, transcript: string): string {
  const patternId = PATTERN_FOR_STAT[id];
  if (patternId) {
    const hit = extractPatternQuotes(transcript, patternId, 1)[0];
    if (hit) return hit;
  }

  const sentences = splitTranscriptSentences(transcript);
  if (!sentences.length) return "";

  const preferLong =
    id === "rambling" ||
    id === "conciseness" ||
    id === "talkingPastPoint" ||
    id === "structure" ||
    id === "repetition" ||
    id === "mentalEffort" ||
    id === "complexLanguage" ||
    id === "concisenessDetail";

  const pick = preferLong
    ? [...sentences].sort((a, b) => b.length - a.length)[0]
    : sentences[Math.min(1, sentences.length - 1)] || sentences[0];

  return clipWords(pick || "", 12);
}

/**
 * Ensure each Part A and Part B section cites words on its weakest markers.
 */
function backfillExamplesAcrossSections(
  stats: DiagnosisStat[],
  transcript: string,
  imageKey: ChallengeImageKey,
  evidenceQuotes: string[],
): DiagnosisStat[] {
  if (!transcript.trim()) return stats;

  const byId = new Map(stats.map((s) => [s.id, { ...s }]));
  const used = new Set(
    stats
      .map((s) => s.example?.trim().toLowerCase())
      .filter(Boolean) as string[],
  );

  const takeUnique = (candidate: string): string => {
    const q = cleanQuote(candidate);
    if (q.length < 2) return "";
    const key = q.toLowerCase();
    if (used.has(key)) return "";
    used.add(key);
    return q.length > 80 ? `${q.slice(0, 79).trimEnd()}…` : q;
  };

  // Main challenge first
  if (
    imageKey !== "generic" &&
    (PART_A_IDS as readonly string[]).includes(imageKey)
  ) {
    const main = byId.get(imageKey);
    if (main && !main.example?.trim()) {
      const q =
        takeUnique(evidenceQuotes[0] || "") ||
        takeUnique(snippetForStat(imageKey as StatId, transcript));
      if (q) byId.set(imageKey, { ...main, example: q });
    }
  }

  const allSections = [...PART_A_SECTIONS, ...PART_B_SECTIONS];

  // Each section: up to 2 lowest markers under 90 without examples
  for (const section of allSections) {
    const sectionStats = section.ids
      .map((id) => byId.get(id as StatId))
      .filter((s): s is DiagnosisStat => Boolean(s))
      .sort((a, b) => a.score - b.score);

    let filled = 0;
    for (const stat of sectionStats) {
      if (filled >= 2) break;
      if (stat.score >= 90) continue;
      if (stat.example?.trim()) {
        filled += 1;
        continue;
      }
      const q = takeUnique(snippetForStat(stat.id as StatId, transcript));
      if (!q) continue;
      byId.set(stat.id, { ...stat, example: q });
      filled += 1;
    }
  }

  return stats.map((s) => byId.get(s.id) || s);
}

/** Clamp a marker score to 0-100. */
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

/** Overall = mean of Part A markers (text-only subset when transcriptOnly). */
export function deriveOverallFromStats(
  stats: DiagnosisStat[],
  opts?: { transcriptOnly?: boolean },
): number {
  const partAIds = opts?.transcriptOnly
    ? (TRANSCRIPT_PART_A_IDS as readonly string[])
    : (PART_A_IDS as readonly string[]);
  const partA = stats.filter((s) => partAIds.includes(s.id));
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

export function buildPartASections(
  stats: DiagnosisStat[],
  opts?: { transcriptOnly?: boolean },
) {
  const sections = opts?.transcriptOnly
    ? (TRANSCRIPT_ONLY_PART_A_SECTIONS as unknown as readonly SectionDef[])
    : (PART_A_SECTIONS as unknown as readonly SectionDef[]);
  return buildStatSections(stats, sections).filter((s) => s.stats.length > 0);
}

export function buildPartBSections(
  stats: DiagnosisStat[],
  opts?: { transcriptOnly?: boolean },
) {
  const sections = opts?.transcriptOnly
    ? (TRANSCRIPT_ONLY_PART_B_SECTIONS as unknown as readonly SectionDef[])
    : (PART_B_SECTIONS as unknown as readonly SectionDef[]);
  return buildStatSections(stats, sections).filter((s) => s.stats.length > 0);
}

export function isHighPerformer(overall: number): boolean {
  return overall >= HIGH_PERFORMER_THRESHOLD;
}

function filterTranscriptOnlyStats(stats: DiagnosisStat[]): DiagnosisStat[] {
  const allowed = new Set<string>([
    ...TRANSCRIPT_PART_A_IDS,
    ...TRANSCRIPT_PART_B_IDS,
  ]);
  return stats.filter((s) => allowed.has(s.id));
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

function lowestPartAId(
  stats: DiagnosisStat[],
  transcript = "",
  opts?: { transcriptOnly?: boolean; overall?: number },
): ChallengeImageKey {
  const partAIds = opts?.transcriptOnly
    ? (TRANSCRIPT_PART_A_IDS as readonly string[])
    : (PART_A_IDS as readonly string[]);
  let partA = stats.filter((s) => partAIds.includes(s.id));
  if (!partA.length) return "generic";

  const overall = opts?.overall ?? deriveOverallFromStats(stats, opts);
  const minScore = Math.min(...partA.map((s) => s.score));
  if (isHighPerformer(overall) && minScore >= HIGH_PERFORMER_THRESHOLD) {
    return "generic";
  }

  const sorted = [...partA].sort((a, b) => a.score - b.score);
  const strictHits = countStrictFillers(transcript);
  const pedagogicalHits = countPedagogicalRepetition(transcript);

  const skipAsMain = (id: string, score: number): boolean => {
    if (id === "fillers" && strictHits < 3) return true;
    if (id === "repetition") {
      if (score >= 75) return true;
      if (pedagogicalHits >= 1 && score >= 68) return true;
      if (isHighPerformer(overall)) return true;
    }
    return false;
  };

  for (const candidate of sorted) {
    if (!skipAsMain(candidate.id, candidate.score)) {
      return candidate.id as ChallengeImageKey;
    }
  }

  const floor = sorted[0]?.score ?? 0;
  const near = sorted.filter((s) => s.score <= floor + 5);
  for (const candidate of near) {
    if (!skipAsMain(candidate.id, candidate.score)) {
      return candidate.id as ChallengeImageKey;
    }
  }

  return "generic";
}

/** Strict verbal tics only — excludes basically/literally/I mean (too easy to over-count). */
function countStrictFillers(transcript: string): number {
  const pattern = /\b(?:um+|uh+|er+|ah+|hmm+)\b|\byou know\b/gi;
  return transcript.match(pattern)?.length ?? 0;
}

/** Intentional teaching / signposting — not empty redundancy. */
function countPedagogicalRepetition(transcript: string): number {
  const pattern =
    /\b(?:again|let me repeat|as i (?:said|mentioned)|the key point|to recap|remember that|once more|as i noted|in other words)\b/gi;
  return transcript.match(pattern)?.length ?? 0;
}

/** Soften over-harsh filler scores when the transcript has few real tics. */
function calibrateFillerScore(
  stats: DiagnosisStat[],
  transcript: string,
): DiagnosisStat[] {
  const strictHits = countStrictFillers(transcript);
  const partAOthers = stats
    .filter(
      (s) =>
        s.id !== "fillers" &&
        (PART_A_IDS as readonly string[]).includes(s.id),
    )
    .map((s) => s.score);
  const otherAvg =
    partAOthers.length > 0
      ? partAOthers.reduce((a, b) => a + b, 0) / partAOthers.length
      : 80;

  return stats.map((s) => {
    if (s.id !== "fillers") return s;
    let score = s.score;
    // Few true tics → keep fillers near the rest of Part A (don't drag overall)
    if (strictHits === 0) score = Math.max(score, Math.round(otherAvg));
    else if (strictHits === 1) score = Math.max(score, Math.round(otherAvg - 3), 78);
    else if (strictHits === 2) score = Math.max(score, Math.round(otherAvg - 6), 72);
    else if (strictHits < 5 && score < 55) score = Math.max(score, 55);
    return score === s.score ? s : { ...s, score };
  });
}

/** Soften over-harsh repetition scores when signposting helps listeners. */
function calibrateRepetitionScore(
  stats: DiagnosisStat[],
  transcript: string,
): DiagnosisStat[] {
  const pedagogicalHits = countPedagogicalRepetition(transcript);
  const partAOthers = stats
    .filter(
      (s) =>
        s.id !== "repetition" &&
        (PART_A_IDS as readonly string[]).includes(s.id),
    )
    .map((s) => s.score);
  const otherAvg =
    partAOthers.length > 0
      ? partAOthers.reduce((a, b) => a + b, 0) / partAOthers.length
      : 80;

  return stats.map((s) => {
    if (s.id !== "repetition") return s;
    let score = s.score;
    if (pedagogicalHits >= 2) score = Math.max(score, Math.round(otherAvg), 78);
    else if (pedagogicalHits === 1)
      score = Math.max(score, Math.round(otherAvg - 4), 72);
    if (otherAvg >= 80 && score < otherAvg - 3) {
      score = Math.max(score, Math.round(otherAvg - 2));
    }
    return score === s.score ? s : { ...s, score };
  });
}

export function normalizeStats(
  raw: Array<{ id: string; label?: string; score: number; example?: string }>,
): DiagnosisStat[] {
  // Models often still emit 1-10. If every present score is <=10, treat as legacy
  // and x10. A true all-markers-<=10 on a 0-100 scale is extremely rare; product
  // priority is fixing the common 1-10 case.
  const present = raw.filter((s) => Number.isFinite(s.score));
  const maxScore =
    present.length > 0 ? Math.max(...present.map((s) => s.score)) : 0;
  const legacyScale = present.length > 0 && maxScore <= 10;

  const byId = new Map<StatId, { score: number; example: string }>();
  for (const row of raw) {
    const id = remapStatId(String(row.id));
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, {
        score: coerceScore100(row.score, legacyScale),
        example: clipProse(stripDashes(row.example || "").trim(), 80),
      });
    }
  }

  return STAT_IDS.map((id) => {
    const hit = byId.get(id);
    return {
      id,
      label: STAT_LABELS[id],
      score: hit?.score ?? 50,
      example: hit?.example || undefined,
    };
  });
}

function clipProse(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function normalizeDiagnosis(
  report: Omit<DiagnosisReport, "transcript"> & { transcript?: string },
  transcriptFallback: string,
  opts?: { transcriptOnly?: boolean },
): DiagnosisReport {
  const transcript = transcriptFallback.trim() || report.transcript?.trim() || "";
  const transcriptOnly = opts?.transcriptOnly ?? false;
  let stats = calibrateRepetitionScore(
    calibrateFillerScore(normalizeStats(report.stats), transcript),
    transcript,
  );
  if (transcriptOnly) {
    stats = filterTranscriptOnlyStats(stats);
  }
  const overall = deriveOverallFromStats(stats, { transcriptOnly });
  const highPerformer = isHighPerformer(overall);
  const imageKey = lowestPartAId(stats, transcript, { transcriptOnly, overall });
  const catalogTitle = highPerformer && imageKey === "generic"
    ? CHALLENGE_LABELS.generic
    : CHALLENGE_LABELS[imageKey];

  const evidenceQuotes = resolveMainEvidenceQuotes({
    evidence: report.mainChallenge.evidence,
    imageKey,
    stats,
    transcript,
  });

  stats = backfillExamplesAcrossSections(
    stats,
    transcript,
    imageKey,
    evidenceQuotes,
  );

  return {
    ...report,
    stats,
    overallScore: Math.min(100, Math.max(0, overall)),
    level: clipProse(scoreLabel(overall), 80),
    transcript,
    transcriptOnly: transcriptOnly || undefined,
    comesAcross: clipProse(stripDashes(report.comesAcross || ""), 450),
    mainChallenge: {
      title: clipProse(catalogTitle, 80),
      summary: clipProse(
        stripDashes(
          highPerformer && imageKey === "generic"
            ? report.mainChallenge.strengths?.trim() ||
                report.mainChallenge.summary?.trim() ||
                "You communicated clearly and held attention across this clip."
            : report.mainChallenge.summary?.trim() || "",
        ),
        450,
      ),
      strengths: clipProse(
        stripDashes(
          report.mainChallenge.strengths?.trim() ||
            "You showed up and shared a real sample. That gives us something concrete to work with.",
        ),
        450,
      ),
      improvements: highPerformer && imageKey === "generic"
        ? ""
        : clipProse(
            stripDashes(
              report.mainChallenge.improvements?.trim() ||
                report.mainChallenge.summary?.trim() ||
                "Tighten one main habit so listeners grasp your point faster and with less effort.",
            ),
            450,
          ),
      evidence: highPerformer && imageKey === "generic"
        ? ""
        : clipProse(evidenceQuotes.join("\n"), 450),
      mechanism: highPerformer && imageKey === "generic"
        ? ""
        : clipProse(
            stripDashes(report.mainChallenge.mechanism?.trim() || ""),
            350,
          ),
      whyItMatters: highPerformer && imageKey === "generic"
        ? ""
        : clipProse(
            stripDashes(report.mainChallenge.whyItMatters?.trim() || ""),
            350,
          ),
      upside: highPerformer && imageKey === "generic"
        ? ""
        : clipProse(
            stripDashes(report.mainChallenge.upside?.trim() || ""),
            350,
          ),
      imageKey,
    },
    minorChallenges: clipProse(
      stripDashes(
        highPerformer
          ? report.minorChallenges?.trim() ||
              "Strong overall: your clearest ideas landed well. Keep the structure and phrasing that already worked — polish is optional, not urgent."
          : report.minorChallenges?.trim() ||
              "What worked: a few moments were easier to follow. What to improve: secondary gaps in pacing and structure still steal clarity. Tighten those next.",
      ),
      600,
    ),
    solutionsCopy: clipProse(
      stripDashes(
        report.solutionsCopy?.trim() ||
          "Keep the habits that already land. Then run 2-3 months of deliberate drills on your three weakest Part A challenges: one-take recordings, shorter answers, and pause practice under light pressure.",
      ),
      600,
    ),
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
