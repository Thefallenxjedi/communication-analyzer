import {
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
  surveysApi,
} from "@/lib/convex-server";

export type SurveyStats = {
  count: number;
  avgRating: number | null;
  recent: {
    id: string;
    rating: number;
    comment: string;
    reportSlug: string;
    createdAt: string;
  }[];
};

export async function submitSurveyRating(input: {
  rating: number;
  comment?: string;
  anonymousId?: string;
  reportSlug?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!isConvexConfigured()) return { ok: false, reason: "not_configured" };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, reason: "not_configured" };

  try {
    const result = (await client.mutation(surveysApi.submit, {
      rating: input.rating,
      comment: input.comment,
      anonymousId: input.anonymousId,
      reportSlug: input.reportSlug,
    })) as { ok?: boolean; reason?: string };
    return {
      ok: Boolean(result?.ok),
      reason: result?.reason,
    };
  } catch (err) {
    console.error("[survey] submit failed", formatConvexError(err), err);
    return { ok: false, reason: "error" };
  }
}

export async function hasSurveyRated(reportSlug: string): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;
  const slug = reportSlug.trim().toLowerCase().slice(0, 32);
  if (!slug) return false;

  try {
    return Boolean(
      await client.query(surveysApi.hasRated, { reportSlug: slug }),
    );
  } catch (err) {
    console.error("[survey] hasRated failed", formatConvexError(err), err);
    return false;
  }
}

export async function getSurveyStats(opts?: {
  fromMs?: number;
  toMs?: number;
}): Promise<SurveyStats | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;

  try {
    return (await client.query(surveysApi.getStats, {
      fromMs: opts?.fromMs,
      toMs: opts?.toMs,
    })) as SurveyStats;
  } catch (err) {
    console.error("[survey] getStats failed", formatConvexError(err), err);
    return null;
  }
}

export async function getSurveyRatingsBySlugs(
  slugs: string[],
): Promise<Record<string, { rating: number; comment: string }>> {
  if (!isConvexConfigured()) return {};
  const client = getConvexHttpClient();
  if (!client) return {};
  const cleaned = [
    ...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  ].slice(0, 200);
  if (cleaned.length === 0) return {};

  try {
    return (await client.query(surveysApi.ratingsBySlugs, {
      slugs: cleaned,
    })) as Record<string, { rating: number; comment: string }>;
  } catch (err) {
    console.error(
      "[survey] ratingsBySlugs failed",
      formatConvexError(err),
      err,
    );
    return {};
  }
}
