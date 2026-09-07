import { formatConvexError } from "@/lib/convex-server";
import {
  getTranscriptPromptState,
  resetTranscriptPrompt,
  saveTranscriptPrompt,
  type TranscriptPromptKey,
} from "@/lib/transcript-prompts";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  try {
    const prompts = await getTranscriptPromptState(convex);
    return Response.json({ prompts });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), prompts: null },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: {
    key?: TranscriptPromptKey;
    body?: string;
    reset?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.key || !["shared", "summary", "tasks"].includes(body.key)) {
    return Response.json({ error: "Valid prompt key required." }, { status: 400 });
  }

  if (body.reset) {
    const ok = await resetTranscriptPrompt(body.key, convex);
    if (!ok) {
      return Response.json(
        { error: "Could not reset transcript prompt." },
        { status: 500 },
      );
    }
    const prompts = await getTranscriptPromptState(convex);
    return Response.json({ ok: true, prompts });
  }

  const text = String(body.body || "").trim();
  if (text.length < 40) {
    return Response.json(
      { error: "Prompt is too short." },
      { status: 400 },
    );
  }

  const result = await saveTranscriptPrompt(body.key, text, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save transcript prompt." },
      { status: 500 },
    );
  }

  const prompts = await getTranscriptPromptState(convex);
  return Response.json({ ok: true, prompts });
}
