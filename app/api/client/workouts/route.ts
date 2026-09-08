import { getActiveClientSession, getAuthedConvexClient } from "@/lib/client-auth";
import { listCoachingSessions, sessionsForClientView } from "@/lib/coaching-sessions";
import {
  completeCoachingTask,
  ensureCoachingProgram,
  listCoachingTasks,
  reviseCoachingTask,
  submitCoachingTask,
  usesVideoLink,
} from "@/lib/coaching-tasks";
import { isClientSessionUnlocked } from "@/lib/coaching-program";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import { normalizeVideoShareUrl } from "@/lib/google-drive";

export const runtime = "nodejs";

function visibleClientTasks(
  tasks: Awaited<ReturnType<typeof listCoachingTasks>>,
  currentStage: string,
  workSessionCount?: number,
) {
  return tasks.filter((task) =>
    isClientSessionUnlocked(task.sessionNumber, currentStage, workSessionCount),
  );
}

export async function GET() {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", tasks: [], sessions: [] }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in.", tasks: [], sessions: [] }, { status: 401 });
  }
  const convex = await getAuthedConvexClient();
  if (!convex) {
    return Response.json({ error: "Not signed in.", tasks: [], sessions: [] }, { status: 401 });
  }
  const row = active.client;

  try {
    await ensureCoachingProgram(row.id, convex);
    const [allTasks, sessionsRaw] = await Promise.all([
      listCoachingTasks(row.id, convex),
      listCoachingSessions(row.id, convex),
    ]);
    const tasks = visibleClientTasks(
      allTasks,
      row.currentStage,
      row.workSessionCount,
    );
    return Response.json({ tasks, sessions: sessionsForClientView(sessionsRaw) });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), tasks: [], sessions: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const convex = await getAuthedConvexClient();
  if (!convex) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const row = active.client;

  let body: {
    id?: string;
    storageId?: string;
    driveUrl?: string;
    durationSec?: number;
    responseText?: string;
    complete?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const id = body.id?.trim() || "";
  const storageId = body.storageId?.trim() || "";
  if (!id) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  try {
    const tasks = await listCoachingTasks(row.id, convex);
    const mine = tasks.find((task) => task.id === id);
    if (!mine) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }
    if (!isClientSessionUnlocked(mine.sessionNumber, row.currentStage, row.workSessionCount)) {
      return Response.json(
        { error: "This session opens after you finish the previous one." },
        { status: 403 },
      );
    }
    if (mine.status !== "open") {
      return Response.json(
        { error: "This task is already submitted." },
        { status: 400 },
      );
    }

    let driveUrl = "";
    if (usesVideoLink(mine)) {
      try {
        driveUrl = normalizeVideoShareUrl(body.driveUrl || "");
      } catch (err) {
        return Response.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Paste a Google Drive or YouTube link.",
          },
          { status: 400 },
        );
      }
    } else if (mine.recordingRequired && !storageId) {
      return Response.json({ error: "Recording is required to submit." }, { status: 400 });
    } else if (!mine.recordingRequired) {
      if (body.complete !== true) {
        return Response.json(
          { error: "Use Complete task for this task." },
          { status: 400 },
        );
      }
      const result = await completeCoachingTask(id, convex);
      if (!result.ok) {
        return Response.json(
          { error: result.error || "Could not complete task." },
          { status: 400 },
        );
      }
      const next = visibleClientTasks(
        await listCoachingTasks(row.id, convex),
        row.currentStage,
        row.workSessionCount,
      );
      return Response.json({ ok: true, tasks: next });
    }
    const result = await submitCoachingTask({
      id,
      storageId: storageId || undefined,
      driveUrl: driveUrl || undefined,
      durationSec: body.durationSec,
      responseText: body.responseText,
    }, convex);
    if (!result.ok) {
      return Response.json(
        { error: result.error || "Could not submit." },
        { status: 400 },
      );
    }
      const next = visibleClientTasks(
        await listCoachingTasks(row.id, convex),
        row.currentStage,
        row.workSessionCount,
      );
      return Response.json({ ok: true, tasks: next });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const convex = await getAuthedConvexClient();
  if (!convex) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const row = active.client;

  let body: {
    id?: string;
    storageId?: string;
    driveUrl?: string;
    durationSec?: number;
    responseText?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const id = body.id?.trim() || "";
  if (!id) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  try {
    const tasks = await listCoachingTasks(row.id, convex);
    const mine = tasks.find((task) => task.id === id);
    if (!mine) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }
    if (!isClientSessionUnlocked(mine.sessionNumber, row.currentStage, row.workSessionCount)) {
      return Response.json(
        { error: "This session opens after you finish the previous one." },
        { status: 403 },
      );
    }
    if (mine.status !== "submitted") {
      return Response.json(
        { error: "Only a submitted response can be edited once." },
        { status: 400 },
      );
    }
    if (mine.clientRevisionUsed) {
      return Response.json(
        { error: "You already used your one edit." },
        { status: 400 },
      );
    }
    let driveUrl: string | undefined;
    if (body.driveUrl != null) {
      try {
        driveUrl = normalizeVideoShareUrl(body.driveUrl);
      } catch (err) {
        return Response.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Paste a Google Drive or YouTube link.",
          },
          { status: 400 },
        );
      }
    }
    const result = await reviseCoachingTask({
      id,
      storageId: body.storageId,
      driveUrl,
      durationSec: body.durationSec,
      responseText: body.responseText,
    }, convex);
    if (!result.ok) {
      return Response.json(
        { error: result.error || "Could not update." },
        { status: 400 },
      );
    }
    const next = visibleClientTasks(
      await listCoachingTasks(row.id, convex),
      row.currentStage,
    );
    return Response.json({ ok: true, tasks: next });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
