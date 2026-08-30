import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import { getSurveyStats } from "@/lib/surveys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured." },
      { status: 503 },
    );
  }
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json(
      { error: "Convex is not configured.", stats: null },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const fromRaw = url.searchParams.get("from")?.trim() || "";
    const toRaw = url.searchParams.get("to")?.trim() || "";

    let fromMs: number | undefined;
    let toMs: number | undefined;
    if (fromRaw) {
      const d = new Date(`${fromRaw}T00:00:00`);
      if (!Number.isNaN(d.getTime())) fromMs = d.getTime();
    }
    if (toRaw) {
      const d = new Date(`${toRaw}T23:59:59.999`);
      if (!Number.isNaN(d.getTime())) toMs = d.getTime();
    }

    const stats = await getSurveyStats({ fromMs, toMs });
    return Response.json({ stats });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), stats: null },
      { status: 500 },
    );
  }
}
