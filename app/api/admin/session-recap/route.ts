import { getCoachingClient } from "@/lib/coaching-clients";
import { sessionLabel } from "@/lib/coaching-program";
import { formatConvexError } from "@/lib/convex-server";
import { captureClientActivity } from "@/lib/posthog-client-activity";
import { getSessionRecap, saveSessionRecap } from "@/lib/session-recap";
import { requireStaffConvex, resolveStaffAccess } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId")?.trim() || "";
  const sessionNumber = Math.round(Number(url.searchParams.get("session") || ""));
  if (!clientId) {
    return Response.json({ error: "clientId required.", recap: null }, { status: 400 });
  }

  try {
    const recap = await getSessionRecap({ clientId, sessionNumber }, convex);
    return Response.json({ recap });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), recap: null },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: {
    clientId?: string;
    sessionNumber?: number;
    recapSummary?: string;
    sourceTranscript?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.clientId?.trim()) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }
  if (!body.recapSummary?.trim()) {
    return Response.json({ error: "recapSummary required." }, { status: 400 });
  }

  const clientId = body.clientId.trim();
  const sessionNumber = Math.round(body.sessionNumber ?? 0);
  const existing = await getSessionRecap({ clientId, sessionNumber }, convex).catch(
    () => undefined,
  );

  const result = await saveSessionRecap({
    clientId,
    sessionNumber,
    recapSummary: body.recapSummary,
    sourceTranscript: body.sourceTranscript,
  }, convex);

  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save recap." },
      { status: 400 },
    );
  }

  if (existing === null) {
    const [client, staff] = await Promise.all([
      getCoachingClient(clientId, convex).catch(() => null),
      resolveStaffAccess(request),
    ]);
    const properties = {
      summary_number: sessionNumber,
      session_label: sessionLabel(sessionNumber, client?.workSessionCount),
    };
    await captureClientActivity({
      distinctId: clientId,
      event: "summary_added",
      properties,
      person: {
        email: client?.email,
        name: client?.name,
        role: "client",
      },
    });
    if (staff?.id) {
      await captureClientActivity({
        distinctId: staff.id,
        event: "summary_added",
        properties,
        person: {
          email: staff.email,
          name: staff.name,
          role: staff.staffRole,
        },
      });
    }
  }

  return Response.json({ ok: true });
}
