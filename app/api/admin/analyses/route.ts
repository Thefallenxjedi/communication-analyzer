import {
  backfillAnalysisDuration,
  deleteAnalysis,
  deleteAnalyses,
  getAnalysisStats,
  listAnalyses,
} from "@/lib/analyses";
import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { formatConvexError, getConvexUrl, isConvexConfigured } from "@/lib/convex-server";
import { getSurveyRatingsBySlugs } from "@/lib/surveys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured on Vercel." },
      { status: 503 },
    );
  }

  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }

  if (!isConvexConfigured()) {
    return Response.json(
      {
        error:
          "Convex URL missing. Set NEXT_PUBLIC_CONVEX_URL=https://blissful-rabbit-594.convex.cloud on Vercel (Production) and redeploy.",
        analyses: [],
        stats: null,
      },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || 100);
    const shouldBackfill = url.searchParams.get("backfillTiming") === "1";

    // Load separately so one failure still returns useful detail
    let analyses: Awaited<ReturnType<typeof listAnalyses>> = [];
    let stats: Awaited<ReturnType<typeof getAnalysisStats>> = null;
    const errors: string[] = [];

    if (shouldBackfill) {
      try {
        await backfillAnalysisDuration(20);
      } catch (err) {
        errors.push(`backfill: ${formatConvexError(err)}`);
      }
    }

    try {
      analyses = await listAnalyses(limit);
    } catch (err) {
      errors.push(formatConvexError(err));
    }

    try {
      stats = await getAnalysisStats();
    } catch (err) {
      errors.push(formatConvexError(err));
    }

    try {
      const slugs = analyses.map((a) => a.reportSlug || "").filter(Boolean);
      const bySlug = await getSurveyRatingsBySlugs(slugs);
      analyses = analyses.map((a) => {
        const slug = (a.reportSlug || "").trim().toLowerCase();
        const hit = slug ? bySlug[slug] : undefined;
        return {
          ...a,
          surveyRating: hit?.rating ?? null,
          surveyComment: hit?.comment || "",
        };
      });
    } catch (err) {
      errors.push(`survey join: ${formatConvexError(err)}`);
    }

    if (errors.length && analyses.length === 0 && !stats) {
      return Response.json(
        {
          error: `Convex error: ${errors.join(" | ")} (url=${getConvexUrl()})`,
          analyses: [],
          stats: null,
        },
        { status: 500 },
      );
    }

    return Response.json({
      analyses,
      stats,
      warning: errors.length ? errors.join(" | ") : undefined,
    });
  } catch (err) {
    console.error("[admin/analyses]", err);
    return Response.json(
      {
        error: `Convex error: ${formatConvexError(err)} (url=${getConvexUrl()})`,
        analyses: [],
        stats: null,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured on Vercel." },
      { status: 503 },
    );
  }
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json(
      { error: "Convex is not configured." },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    let ids: string[] = [];

    const single = url.searchParams.get("id")?.trim();
    if (single) ids.push(single);

    try {
      const body = (await request.json()) as { id?: string; ids?: string[] };
      if (typeof body.id === "string" && body.id.trim()) {
        ids.push(body.id.trim());
      }
      if (Array.isArray(body.ids)) {
        for (const raw of body.ids) {
          if (typeof raw === "string" && raw.trim()) ids.push(raw.trim());
        }
      }
    } catch {
      // no body
    }

    ids = [...new Set(ids)].slice(0, 500);
    if (ids.length === 0) {
      return Response.json({ error: "Missing analysis id(s)." }, { status: 400 });
    }

    if (ids.length === 1) {
      const ok = await deleteAnalysis(ids[0]);
      if (!ok) {
        return Response.json(
          { error: "Could not delete that row (not found or Convex error)." },
          { status: 404 },
        );
      }
      return Response.json({ ok: true, deleted: 1 });
    }

    const result = await deleteAnalyses(ids);
    if (!result) {
      return Response.json(
        { error: "Could not delete selected rows (Convex error)." },
        { status: 500 },
      );
    }
    return Response.json({
      ok: true,
      deleted: result.deleted,
      missing: result.missing,
    });
  } catch (err) {
    console.error("[admin/analyses] DELETE", err);
    return Response.json(
      { error: `Delete failed: ${formatConvexError(err)}` },
      { status: 500 },
    );
  }
}
