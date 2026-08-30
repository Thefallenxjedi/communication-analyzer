import {
  analysesApi,
  formatConvexError,
  getConvexHttpClient,
  getConvexUrl,
  isConvexConfigured,
} from "@/lib/convex-server";

export type AnalysisRecord = {
  anonymousId: string;
  overallScore: number;
  durationSec: number | null;
  level: string;
  mainFocus: string;
  source?: string;
  captureMethod?: string;
  firstName?: string;
  email?: string;
  status?: "success" | "failed";
  failureReason?: string;
  reportSlug?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  analysisDurationMs?: number;
  promptAddOnIds?: string[];
  createdAt?: Date;
};

export type AnalysisListItem = {
  id: string;
  anonymousId: string;
  overallScore: number;
  durationSec: number | null;
  level: string;
  mainFocus: string;
  source?: string;
  captureMethod?: string;
  firstName: string;
  email: string;
  status?: "success" | "failed";
  failureReason?: string;
  reportSlug?: string;
  costUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  analysisDurationMs?: number | null;
  analysisDurationEstimated?: boolean;
  /** User 1–5 usefulness rating when present. */
  surveyRating?: number | null;
  surveyComment?: string;
  createdAt: string;
};

export type AnalysisStats = {
  totalAttempts: number;
  uniqueUsers: number;
  avgScore: number;
  failedAttempts?: number;
  leadsWithEmail?: number;
  incompleteLeads?: number;
  totalCostUsd?: number;
  /** Mean server generation time (ms) among the last 20 attempts with timing data. */
  avgAnalysisDurationMs?: number | null;
  avgAnalysisDurationSampleCount?: number;
  days: {
    date: string;
    attempts: number;
    uniqueUsers: number;
    avgScore: number;
  }[];
  topUsers: {
    anonymousId: string;
    attempts: number;
    lastScore: number;
    lastAt: string;
  }[];
  mainFocusBreakdown?: {
    focus: string;
    count: number;
    percent: number;
  }[];
  levelBreakdown?: {
    level: string;
    count: number;
    percent: number;
  }[];
};

export async function insertAnalysis(
  input: Omit<AnalysisRecord, "createdAt">,
): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;

  try {
    await client.mutation(analysesApi.insert, {
      anonymousId: input.anonymousId.slice(0, 128),
      overallScore: input.overallScore,
      durationSec: input.durationSec,
      level: input.level.slice(0, 120),
      mainFocus: input.mainFocus.slice(0, 200),
      source: input.source?.slice(0, 64),
      captureMethod: input.captureMethod?.slice(0, 32),
      firstName: input.firstName?.slice(0, 80),
      email: input.email?.slice(0, 200),
      status: input.status ?? "success",
      failureReason: input.failureReason?.slice(0, 240),
      reportSlug: input.reportSlug?.slice(0, 32),
      costUsd: input.costUsd,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      analysisDurationMs: input.analysisDurationMs,
      promptAddOnIds: input.promptAddOnIds?.slice(0, 50),
    });
    return true;
  } catch (err) {
    console.error("[analyses] convex insert failed", formatConvexError(err), err);
    return false;
  }
}

export async function insertFailedAnalysis(input: {
  anonymousId: string;
  durationSec?: number | null;
  source?: string;
  captureMethod?: string;
  firstName?: string;
  email?: string;
  failureReason: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  analysisDurationMs?: number;
}): Promise<boolean> {
  return insertAnalysis({
    anonymousId: input.anonymousId,
    overallScore: 0,
    durationSec: input.durationSec ?? null,
    level: "",
    mainFocus: "",
    source: input.source,
    captureMethod: input.captureMethod,
    firstName: input.firstName,
    email: input.email,
    status: "failed",
    failureReason: input.failureReason,
    costUsd: input.costUsd,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    analysisDurationMs: input.analysisDurationMs,
  });
}

export async function attachLeadToAnalysis(input: {
  anonymousId: string;
  firstName: string;
  email: string;
  source?: string;
}): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;

  try {
    await client.mutation(analysesApi.attachLead, {
      anonymousId: input.anonymousId.slice(0, 128),
      firstName: input.firstName.slice(0, 80),
      email: input.email.slice(0, 200),
      source: input.source?.slice(0, 64),
    });
    return true;
  } catch (err) {
    console.error("[analyses] attachLead failed", formatConvexError(err), err);
    return false;
  }
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;
  const trimmed = id.trim();
  if (!trimmed) return false;

  try {
    const result = (await client.mutation(analysesApi.remove, {
      id: trimmed as never,
    })) as { ok?: boolean };
    return Boolean(result?.ok);
  } catch (err) {
    console.error("[analyses] remove failed", formatConvexError(err), err);
    return false;
  }
}

export async function deleteAnalyses(
  ids: string[],
): Promise<{ deleted: number; missing: number } | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;
  const cleaned = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    500,
  );
  if (cleaned.length === 0) return { deleted: 0, missing: 0 };

  try {
    const result = (await client.mutation(analysesApi.removeMany, {
      ids: cleaned as never,
    })) as { ok?: boolean; deleted?: number; missing?: number };
    return {
      deleted: result?.deleted ?? 0,
      missing: result?.missing ?? 0,
    };
  } catch (err) {
    console.error("[analyses] removeMany failed", formatConvexError(err), err);
    return null;
  }
}

export async function listAnalyses(limit = 100): Promise<AnalysisListItem[]> {
  if (!isConvexConfigured()) return [];
  const client = getConvexHttpClient();
  if (!client) return [];

  try {
    const rows = await client.query(analysesApi.listRecent, {
      limit: Math.min(500, Math.max(1, limit)),
    });
    return (rows as AnalysisListItem[]).map((r) => ({
      ...r,
      firstName: r.firstName || "",
      email: r.email || "",
      failureReason: r.failureReason || "",
      reportSlug: r.reportSlug || "",
      captureMethod: r.captureMethod || "",
      costUsd: r.costUsd ?? null,
      inputTokens: r.inputTokens ?? null,
      outputTokens: r.outputTokens ?? null,
      analysisDurationMs: r.analysisDurationMs ?? null,
      analysisDurationEstimated: Boolean(r.analysisDurationEstimated),
    }));
  } catch (err) {
    console.error("[analyses] convex list failed", formatConvexError(err), err);
    throw new Error(`listRecent @ ${getConvexUrl()}: ${formatConvexError(err)}`);
  }
}

export async function getAnalysisStats(): Promise<AnalysisStats | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;

  try {
    return (await client.query(analysesApi.getStats, {})) as AnalysisStats;
  } catch (err) {
    console.error("[analyses] convex stats failed", formatConvexError(err), err);
    throw new Error(`getStats @ ${getConvexUrl()}: ${formatConvexError(err)}`);
  }
}

/** Fill estimated generation times for recent rows missing wall-clock data. */
export async function backfillAnalysisDuration(
  limit = 20,
): Promise<{ patched: number } | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;

  try {
    const result = (await client.mutation(
      analysesApi.backfillAnalysisDuration,
      { limit: Math.min(100, Math.max(1, limit)) },
    )) as { patched?: number };
    return { patched: result?.patched ?? 0 };
  } catch (err) {
    console.error("[analyses] backfill duration failed", formatConvexError(err), err);
    return null;
  }
}

/** Top X% vs historical scores. Null if Convex missing or too few samples. */
export async function getScoreTopPercent(
  score: number,
): Promise<number | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;
  if (!Number.isFinite(score)) return null;

  try {
    const top = await client.query(analysesApi.scoreTopPercent, {
      score: Math.round(score),
    });
    if (typeof top !== "number" || !Number.isFinite(top)) return null;
    return Math.max(1, Math.min(99, Math.round(top)));
  } catch (err) {
    console.error(
      "[analyses] scoreTopPercent failed",
      formatConvexError(err),
      err,
    );
    return null;
  }
}
