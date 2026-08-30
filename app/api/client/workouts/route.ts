import { getCoachingClientByEmail } from "@/lib/coaching-clients";
import { listCoachingSessions } from "@/lib/coaching-sessions";
import {
  completeCoachingTask,
  ensureCoachingProgram,
  listCoachingTasks,
  needsCoachReview,
  reviseCoachingTask,
  submitCoachingTask,
} from "@/lib/coaching-tasks";
import { readClientEmailFromCookie } from "@/lib/client-session";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import { normalizeGoogleDriveUrl } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", tasks: [], sessions: [] }, { status: 503 });
  }

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ error: "Not signed in.", tasks: [], sessions: [] }, { status: 401 });
  }

  try {
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json({ error: "Not enrolled.", tasks: [], sessions: [] }, { status: 401 });
    }
    await ensureCoachingProgram(row.id);
    const [tasks, sessions] = await Promise.all([
      listCoachingTasks(row.id),
      listCoachingSessions(row.id),
    ]);
    return Response.json({ tasks, sessions });
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

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

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
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json({ error: "Not enrolled." }, { status: 401 });
    }
    const tasks = await listCoachingTasks(row.id);
    const mine = tasks.find((task) => task.id === id);
    if (!mine) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }
    if (mine.status !== "open") {
      return Response.json(
        { error: "This task is already submitted." },
        { status: 400 },
      );
    }

    if (body.complete === true) {
      if (mine.recordingRequired || needsCoachReview(mine)) {
        return Response.json(
          { error: "This task still needs a video link or coach review." },
          { status: 400 },
        );
      }
      const result = await completeCoachingTask(id);
      if (!result.ok) {
        return Response.json(
          { error: result.error || "Could not complete." },
          { status: 400 },
        );
      }
      const next = await listCoachingTasks(row.id);
      return Response.json({ ok: true, tasks: next });
    }

    let driveUrl = "";
    if (mine.recordingRequired) {
      try {
        driveUrl = normalizeGoogleDriveUrl(body.driveUrl || "");
      } catch (err) {
        return Response.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Paste a Google Drive link for your video.",
          },
          { status: 400 },
        );
      }
    } else if (!storageId) {
      return Response.json({ error: "Nothing to submit." }, { status: 400 });
    }
    const result = await submitCoachingTask({
      id,
      storageId: storageId || undefined,
      driveUrl: driveUrl || undefined,
      durationSec: body.durationSec,
      responseText: body.responseText,
    });
    if (!result.ok) {
      return Response.json(
        { error: result.error || "Could not submit." },
        { status: 400 },
      );
    }
    const next = await listCoachingTasks(row.id);
    return Response.json({ ok: true, tasks: next });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

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
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json({ error: "Not enrolled." }, { status: 401 });
    }
    const tasks = await listCoachingTasks(row.id);
    const mine = tasks.find((task) => task.id === id);
    if (!mine) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }
    if (mine.status !== "submitted") {
      return Response.json(
        { error: "Only a submitted response can be changed once." },
        { status: 400 },
      );
    }
    if (mine.clientRevisionUsed) {
      return Response.json(
        { error: "You already used your one change." },
        { status: 400 },
      );
    }
    let driveUrl: string | undefined;
    if (body.driveUrl != null) {
      try {
        driveUrl = normalizeGoogleDriveUrl(body.driveUrl);
      } catch (err) {
        return Response.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Paste a Google Drive link for your video.",
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
    });
    if (!result.ok) {
      return Response.json(
        { error: result.error || "Could not update." },
        { status: 400 },
      );
    }
    const next = await listCoachingTasks(row.id);
    return Response.json({ ok: true, tasks: next });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
