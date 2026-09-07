import { formatConvexError } from "@/lib/convex-server";
import {
  getDiagnosisCorePromptState,
  resetDiagnosisCorePrompt,
  saveDiagnosisCorePrompt,
} from "@/lib/diagnosis-core-prompt";
import {
  createPromptAddOn,
  listPromptAddOns,
  removePromptAddOn,
  setPromptAddOnEnabled,
  updatePromptAddOn,
} from "@/lib/prompt-addons";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  try {
    const [addOns, corePrompt] = await Promise.all([
      listPromptAddOns(convex),
      getDiagnosisCorePromptState(convex),
    ]);
    return Response.json({ addOns, corePrompt });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), addOns: [], corePrompt: null },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: { body?: string; reset?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.reset) {
    const ok = await resetDiagnosisCorePrompt(convex);
    if (!ok) {
      return Response.json(
        { error: "Could not reset core prompt." },
        { status: 500 },
      );
    }
    const corePrompt = await getDiagnosisCorePromptState(convex);
    return Response.json({ ok: true, corePrompt });
  }

  const text = String(body.body || "").trim();
  if (text.length < 200) {
    return Response.json(
      { error: "Core prompt is too short — keep the full system prompt." },
      { status: 400 },
    );
  }

  const result = await saveDiagnosisCorePrompt(text, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save core prompt." },
      { status: 500 },
    );
  }
  const corePrompt = await getDiagnosisCorePromptState(convex);
  return Response.json({ ok: true, corePrompt });
}

export async function POST(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: { title?: string; body?: string; enabled?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  if (!title || !text) {
    return Response.json(
      { error: "Title and note body are required." },
      { status: 400 },
    );
  }

  const result = await createPromptAddOn({
    title,
    body: text,
    enabled: body.enabled !== false,
  }, convex);
  if (!result.ok) {
    return Response.json(
      { error: "Could not create prompt add-on." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, id: result.id });
}

export async function PATCH(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: {
    id?: string;
    title?: string;
    body?: string;
    enabled?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const id = String(body.id || "").trim();
  if (!id) {
    return Response.json({ error: "Missing add-on id." }, { status: 400 });
  }

  if (
    typeof body.enabled === "boolean" &&
    body.title == null &&
    body.body == null
  ) {
    const ok = await setPromptAddOnEnabled(id, body.enabled, convex);
    if (!ok) {
      return Response.json(
        { error: "Could not update add-on." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true });
  }

  const ok = await updatePromptAddOn({
    id,
    title: body.title,
    body: body.body,
    enabled: body.enabled,
  }, convex);
  if (!ok) {
    return Response.json(
      { error: "Could not update add-on." },
      { status: 404 },
    );
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  const url = new URL(request.url);
  let id = url.searchParams.get("id")?.trim() || "";
  if (!id) {
    try {
      const body = (await request.json()) as { id?: string };
      id = String(body.id || "").trim();
    } catch {
      // no body
    }
  }
  if (!id) {
    return Response.json({ error: "Missing add-on id." }, { status: 400 });
  }

  const ok = await removePromptAddOn(id, convex);
  if (!ok) {
    return Response.json(
      { error: "Could not delete add-on." },
      { status: 404 },
    );
  }
  return Response.json({ ok: true });
}
