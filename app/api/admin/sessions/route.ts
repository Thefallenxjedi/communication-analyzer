import { adminApiGuard } from "@/lib/admin-route";
import {
  listCoachingSessions,
  markCoachingSessionReady,
} from "@/lib/coaching-sessions";
import { formatConvexError } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await adminApiGuard(request, "viewer");
  if (denied) return denied;

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  try {
    const sessions = await listCoachingSessions(clientId);
    return Response.json({ sessions });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await adminApiGuard(request, "editor");
  if (denied) return denied;

  let body: { clientId?: string; sessionNumber?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.clientId?.trim() || typeof body.sessionNumber !== "number") {
    return Response.json({ error: "clientId and sessionNumber required." }, { status: 400 });
  }

  const result = await markCoachingSessionReady({
    clientId: body.clientId,
    sessionNumber: body.sessionNumber,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not mark session ready." },
      { status: 400 },
    );
  }
  const sessions = await listCoachingSessions(body.clientId);
  return Response.json({ ok: true, sessions });
}
