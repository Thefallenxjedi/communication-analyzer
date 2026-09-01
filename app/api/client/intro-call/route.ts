import { getActiveClientSession } from "@/lib/client-auth";
import { getIntroCallReport } from "@/lib/intro-call";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET() {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", report: null }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in.", report: null }, { status: 401 });
  }

  try {
    const report = await getIntroCallReport(active.client.id);
    return Response.json({ report });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), report: null },
      { status: 500 },
    );
  }
}
