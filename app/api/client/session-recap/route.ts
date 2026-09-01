import { getActiveClientSession } from "@/lib/client-auth";
import { getSessionRecap } from "@/lib/session-recap";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", recap: null }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in.", recap: null }, { status: 401 });
  }

  const sessionRaw = new URL(request.url).searchParams.get("session");
  const sessionNumber = sessionRaw ? Math.round(Number(sessionRaw)) : NaN;
  if (!Number.isFinite(sessionNumber) || sessionNumber < 1) {
    return Response.json({ error: "session required.", recap: null }, { status: 400 });
  }

  try {
    const recap = await getSessionRecap({
      clientId: active.client.id,
      sessionNumber,
    });
    return Response.json({
      recap: recap
        ? {
            sessionNumber: recap.sessionNumber,
            recapSummary: recap.recapSummary,
            recapUpdatedAt: recap.recapUpdatedAt,
          }
        : null,
    });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), recap: null },
      { status: 500 },
    );
  }
}
