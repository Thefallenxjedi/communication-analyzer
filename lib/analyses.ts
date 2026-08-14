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
  firstName: string;
  email: string;
  createdAt: string;
};

export type AnalysisStats = {
  totalAttempts: number;
  uniqueUsers: number;
  avgScore: number;
  leadsWithEmail?: number;
  incompleteLeads?: number;
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
    });
    return true;
  } catch (err) {
    console.error("[analyses] convex insert failed", formatConvexError(err), err);
    return false;
  }
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
