import {
  getCoachingClient,
  setCoachingClientAdminNotes,
} from "@/lib/coaching-clients";
import { listCoachingSessions } from "@/lib/coaching-sessions";
import { ensureCoachingProgram, listCoachingTasks } from "@/lib/coaching-tasks";
import { formatConvexError } from "@/lib/convex-server";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  try {
    await ensureCoachingProgram(id, convex);
    const client = await getCoachingClient(id, convex);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }
    const [tasks, sessions] = await Promise.all([
      listCoachingTasks(client.id, convex),
      listCoachingSessions(client.id, convex),
    ]);
    return Response.json({ client, tasks, sessions });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  let body: { adminNotes?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (typeof body.adminNotes !== "string") {
    return Response.json({ error: "adminNotes required." }, { status: 400 });
  }

  const result = await setCoachingClientAdminNotes(
    { id, adminNotes: body.adminNotes },
    convex,
  );
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save client notes." },
      { status: 400 },
    );
  }
  const client = await getCoachingClient(id, convex);
  return Response.json({ ok: true, client });
}
