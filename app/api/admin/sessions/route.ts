import {
  addCoachingWorkSession,
  listCoachingSessions,
  markCoachingSessionReady,
  removeCoachingWorkSession,
  setCoachingAdminNotes,
} from "@/lib/coaching-sessions";
import { getCoachingClient } from "@/lib/coaching-clients";
import { formatConvexError } from "@/lib/convex-server";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  try {
    const sessions = await listCoachingSessions(clientId, convex);
    return Response.json({ sessions });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: {
    clientId?: string;
    sessionNumber?: number;
    action?: "markReady" | "addWorkSession" | "removeWorkSession";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.clientId?.trim()) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  const action = body.action ?? "markReady";

  try {
    if (action === "addWorkSession") {
      const result = await addCoachingWorkSession(body.clientId, convex);
      if (!result.ok) {
        return Response.json(
          { error: result.error || "Could not add session." },
          { status: 400 },
        );
      }
      const [sessions, client] = await Promise.all([
        listCoachingSessions(body.clientId, convex),
        getCoachingClient(body.clientId, convex),
      ]);
      return Response.json({
        ok: true,
        sessions,
        workSessionCount: result.workSessionCount ?? client?.workSessionCount,
        client,
      });
    }

    if (action === "removeWorkSession") {
      if (typeof body.sessionNumber !== "number") {
        return Response.json(
          { error: "sessionNumber required to remove a session." },
          { status: 400 },
        );
      }
      const result = await removeCoachingWorkSession(
        { clientId: body.clientId, sessionNumber: body.sessionNumber },
        convex,
      );
      if (!result.ok) {
        return Response.json(
          { error: result.error || "Could not remove session." },
          { status: 400 },
        );
      }
      const [sessions, client] = await Promise.all([
        listCoachingSessions(body.clientId, convex),
        getCoachingClient(body.clientId, convex),
      ]);
      return Response.json({
        ok: true,
        sessions,
        workSessionCount: result.workSessionCount ?? client?.workSessionCount,
        client,
      });
    }

    if (typeof body.sessionNumber !== "number") {
      return Response.json(
        { error: "clientId and sessionNumber required." },
        { status: 400 },
      );
    }

    const result = await markCoachingSessionReady({
      clientId: body.clientId,
      sessionNumber: body.sessionNumber,
    }, convex);
    if (!result.ok) {
      return Response.json(
        { error: result.error || "Could not mark session ready." },
        { status: 400 },
      );
    }
    const sessions = await listCoachingSessions(body.clientId, convex);
    return Response.json({ ok: true, sessions });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: {
    clientId?: string;
    sessionNumber?: number;
    adminNotes?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.clientId?.trim() || typeof body.sessionNumber !== "number") {
    return Response.json(
      { error: "clientId and sessionNumber required." },
      { status: 400 },
    );
  }
  if (typeof body.adminNotes !== "string") {
    return Response.json({ error: "adminNotes required." }, { status: 400 });
  }

  const result = await setCoachingAdminNotes({
    clientId: body.clientId,
    sessionNumber: body.sessionNumber,
    adminNotes: body.adminNotes,
  }, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save notes." },
      { status: 400 },
    );
  }
  const sessions = await listCoachingSessions(body.clientId, convex);
  return Response.json({ ok: true, sessions });
}
