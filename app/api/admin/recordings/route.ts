import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import {
  extFromContentType,
  recordingDownloadName,
} from "@/lib/coaching-program";
import { getCoachingTask } from "@/lib/coaching-tasks";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

function asciiFilename(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_");
}

export async function GET(request: Request) {
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

  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!id) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  try {
    const task = await getCoachingTask(id);
    if (!task) {
      return Response.json({ error: "Recording not found." }, { status: 404 });
    }
    if (!task.recordingUrl) {
      return Response.json({ error: "Not recorded yet." }, { status: 404 });
    }

    const fileRes = await fetch(task.recordingUrl);
    if (!fileRes.ok) {
      return Response.json(
        { error: "Could not fetch recording." },
        { status: 502 },
      );
    }

    const type = fileRes.headers.get("content-type") || "application/octet-stream";
    const filename = recordingDownloadName({
      clientName: task.clientName,
      sessionNumber: task.sessionNumber,
      about: task.title,
      ext: extFromContentType(type),
    });
    const safe = asciiFilename(filename);
    const body = new Uint8Array(await fileRes.arrayBuffer());

    return new Response(body, {
      headers: {
        "content-type": type,
        "content-disposition": `attachment; filename="${safe}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
