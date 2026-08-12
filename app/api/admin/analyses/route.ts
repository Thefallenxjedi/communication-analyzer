import {
  getAnalysisStats,
  listAnalyses,
} from "@/lib/analyses";
import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { formatConvexError, getConvexUrl, isConvexConfigured } from "@/lib/convex-server";

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

    // Load separately so one failure still returns useful detail
    let analyses: Awaited<ReturnType<typeof listAnalyses>> = [];
    let stats: Awaited<ReturnType<typeof getAnalysisStats>> = null;
    const errors: string[] = [];

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
