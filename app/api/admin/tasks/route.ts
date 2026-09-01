import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { listCoachingSessions } from "@/lib/coaching-sessions";
import {
  completeCoachingTask,
  createCoachingTask,
  getCoachingTask,
  listCoachingTasks,
  needsCoachReview,
  rateCoachingTask,
  removeCoachingTask,
  updateCoachingTask,
} from "@/lib/coaching-tasks";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

function adminGate() {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured." },
      { status: 503 },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const denied = adminGate();
  if (denied) return denied;
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured.", tasks: [] }, { status: 503 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "clientId required.", tasks: [] }, { status: 400 });
  }

  try {
    const tasks = await listCoachingTasks(clientId);
    return Response.json({ tasks });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), tasks: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = adminGate();
  if (denied) return denied;
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

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
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not create workout." },
      { status: 400 },
    );
  }
  const [tasks, sessions] = await Promise.all([
    listCoachingTasks(body.clientId),
    listCoachingSessions(body.clientId),
  ]);
  return Response.json({ ok: true, id: result.id, tasks, sessions });
}

export async function PATCH(request: Request) {
  const denied = adminGate();
  if (denied) return denied;
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  let body: {
    id?: string;
    clientId?: string;
    rating?: number;
    comment?: string;
    title?: string;
    instructions?: string;
    recordingRequired?: boolean;
    reviewRequired?: boolean;
    complete?: boolean;
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
  if (!editingCopy && !completing && typeof body.rating !== "number") {
    return Response.json({ error: "rating or title required." }, { status: 400 });
  }

  if (completing) {
    const task = await getCoachingTask(body.id);
    if (task && !needsCoachReview(task)) {
      return Response.json(
        { error: "The client marks this complete from their session." },
        { status: 400 },
      );
    }
  }

  const result = completing
    ? await completeCoachingTask(body.id)
    : editingCopy
    ? await updateCoachingTask({
        id: body.id,
        title: body.title,
        instructions: body.instructions,
        recordingRequired: body.recordingRequired,
        reviewRequired: body.reviewRequired,
      })
    : await rateCoachingTask({
        id: body.id,
        rating: body.rating as number,
        comment: body.comment,
      });
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not update task." },
      { status: 400 },
    );
  }
  const tasks = body.clientId ? await listCoachingTasks(body.clientId) : [];
  const sessions = body.clientId ? await listCoachingSessions(body.clientId) : [];
  return Response.json({ ok: true, tasks, sessions });
}

export async function DELETE(request: Request) {
  const denied = adminGate();
  if (denied) return denied;
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() || "";
  const clientId = url.searchParams.get("clientId")?.trim() || "";
  if (!id) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  const result = await removeCoachingTask(id);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not delete workout." },
      { status: 400 },
    );
  }
  const tasks = clientId ? await listCoachingTasks(clientId) : [];
  const sessions = clientId ? await listCoachingSessions(clientId) : [];
  return Response.json({ ok: true, tasks, sessions });
}
