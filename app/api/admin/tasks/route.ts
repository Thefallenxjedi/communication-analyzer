import { listCoachingSessions } from "@/lib/coaching-sessions";
import {
  completeCoachingTask,
  createCoachingTask,
  getCoachingTask,
  listCoachingTasks,
  markCoachingTaskReviewed,
  needsCoachReview,
  removeCoachingTask,
  updateCoachingTask,
} from "@/lib/coaching-tasks";
import { formatConvexError } from "@/lib/convex-server";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "clientId required.", tasks: [] }, { status: 400 });
  }

  try {
    const tasks = await listCoachingTasks(clientId, convex);
    return Response.json({ tasks });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), tasks: [] },
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
    title?: string;
    instructions?: string;
    recordingRequired?: boolean;
    reviewRequired?: boolean;
    expectedMinutes?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.clientId?.trim()) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  const result = await createCoachingTask({
    clientId: body.clientId,
    sessionNumber: body.sessionNumber,
    title: body.title ?? "",
    instructions: body.instructions ?? "",
    recordingRequired: body.recordingRequired,
    reviewRequired: body.reviewRequired,
    expectedMinutes: body.expectedMinutes,
  }, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not create workout." },
      { status: 400 },
    );
  }
  const [tasks, sessions] = await Promise.all([
    listCoachingTasks(body.clientId, convex),
    listCoachingSessions(body.clientId, convex),
  ]);
  return Response.json({ ok: true, id: result.id, tasks, sessions });
}

export async function PATCH(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: {
    id?: string;
    clientId?: string;
    title?: string;
    instructions?: string;
    recordingRequired?: boolean;
    reviewRequired?: boolean;
    complete?: boolean;
    markReviewed?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.id?.trim()) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  const editingCopy =
    typeof body.title === "string" || typeof body.instructions === "string";
  const completing = body.complete === true;
  const reviewing = body.markReviewed === true;
  if (!editingCopy && !completing && !reviewing) {
    return Response.json(
      { error: "title, complete, or markReviewed required." },
      { status: 400 },
    );
  }

  if (completing) {
    const task = await getCoachingTask(body.id, convex);
    if (task && !needsCoachReview(task)) {
      return Response.json(
        { error: "The client marks this complete from their session." },
        { status: 400 },
      );
    }
  }

  const result = completing
    ? await completeCoachingTask(body.id, convex)
    : reviewing
      ? await markCoachingTaskReviewed(body.id, convex)
      : await updateCoachingTask({
          id: body.id,
          title: body.title,
          instructions: body.instructions,
          recordingRequired: body.recordingRequired,
          reviewRequired: body.reviewRequired,
        }, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not update task." },
      { status: 400 },
    );
  }
  const tasks = body.clientId ? await listCoachingTasks(body.clientId, convex) : [];
  const sessions = body.clientId ? await listCoachingSessions(body.clientId, convex) : [];
  return Response.json({ ok: true, tasks, sessions });
}

export async function DELETE(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() || "";
  const clientId = url.searchParams.get("clientId")?.trim() || "";
  if (!id) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  const result = await removeCoachingTask(id, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not delete workout." },
      { status: 400 },
    );
  }
  const tasks = clientId ? await listCoachingTasks(clientId, convex) : [];
  const sessions = clientId ? await listCoachingSessions(clientId, convex) : [];
  return Response.json({ ok: true, tasks, sessions });
}
