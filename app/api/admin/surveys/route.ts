import { adminApiGuard } from "@/lib/admin-route";
import { formatConvexError } from "@/lib/convex-server";
import { getSurveyStats } from "@/lib/surveys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await adminApiGuard(request, "viewer");
  if (denied) return denied;

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
