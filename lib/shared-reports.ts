import type { DiagnosisReport } from "@/lib/schema";
import { diagnosisReportSchema } from "@/lib/schema";
import {
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
  reportsApi,
} from "@/lib/convex-server";

export type SharedReportCreateResult = {
  slug: string;
  path: string;
};

export async function createSharedReport(input: {
  report: DiagnosisReport;
  anonymousId: string;
  firstName?: string;
  email?: string;
  source?: string;
}): Promise<SharedReportCreateResult | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;

  try {
    const result = (await client.mutation(reportsApi.create, {
      reportJson: JSON.stringify(input.report),
      anonymousId: input.anonymousId.slice(0, 128),
      overallScore: Math.round(input.report.overallScore),
      level: (input.report.level || "").slice(0, 120),
      mainFocus: (input.report.mainChallenge?.title || "").slice(0, 200),
      firstName: input.firstName?.slice(0, 80),
      email: input.email?.slice(0, 200),
      source: input.source?.slice(0, 64),
    })) as SharedReportCreateResult;
    if (!result?.slug) return null;
    return result;
  } catch (err) {
    console.error(
      "[shared-reports] create failed",
      formatConvexError(err),
      err,
    );
    return null;
  }
}

export type SharedReportLookup = {
  slug: string;
  report: DiagnosisReport;
  createdAt: number;
} | null;

export async function getSharedReportBySlug(
  slug: string,
): Promise<SharedReportLookup> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;
  const cleaned = slug.trim().toLowerCase().slice(0, 32);
  if (!cleaned) return null;

  try {
    const row = (await client.query(reportsApi.getBySlug, {
      slug: cleaned,
    })) as {
      slug: string;
      report?: unknown;
      createdAt: number;
    } | null;

    if (!row) return null;

    const parsed = diagnosisReportSchema.safeParse(row.report);
    if (!parsed.success) {
      console.error("[shared-reports] invalid stored report", parsed.error);
      return null;
    }

    return {
      slug: row.slug,
      report: parsed.data,
      createdAt: row.createdAt,
    };
  } catch (err) {
    console.error(
      "[shared-reports] getBySlug failed",
      formatConvexError(err),
      err,
    );
    return null;
  }
}

export function absoluteReportUrl(slug: string, origin?: string): string {
  const base =
    origin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://app.elitespeakprogram.com";
  return `${base}/r/${slug}`;
}
