import { getCoachingClient } from "@/lib/coaching-clients";
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
