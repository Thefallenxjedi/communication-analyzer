import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { getCoachingClient } from "@/lib/coaching-clients";
import { listCoachingSessions } from "@/lib/coaching-sessions";
import { ensureCoachingProgram, listCoachingTasks } from "@/lib/coaching-tasks";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  try {
    await ensureCoachingProgram(id);
    const client = await getCoachingClient(id);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }
    const [tasks, sessions] = await Promise.all([
      listCoachingTasks(client.id),
      listCoachingSessions(client.id),
    ]);
    return Response.json({ client, tasks, sessions });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
