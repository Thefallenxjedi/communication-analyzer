import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { getSessionRecap, saveSessionRecap } from "@/lib/session-recap";
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
    return Response.json({ error: "Convex is not configured.", recap: null }, { status: 503 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId")?.trim() || "";
  const sessionNumber = Math.round(Number(url.searchParams.get("session") || ""));
  if (!clientId) {
    return Response.json({ error: "clientId required.", recap: null }, { status: 400 });
  }

  try {
    const recap = await getSessionRecap({ clientId, sessionNumber });
    return Response.json({ recap });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), recap: null },
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
    recapSummary?: string;
    sourceTranscript?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.clientId?.trim()) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }
  if (!body.recapSummary?.trim()) {
    return Response.json({ error: "recapSummary required." }, { status: 400 });
  }

  const result = await saveSessionRecap({
    clientId: body.clientId.trim(),
    sessionNumber: Math.round(body.sessionNumber ?? 0),
    recapSummary: body.recapSummary,
    sourceTranscript: body.sourceTranscript,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save recap." },
      { status: 400 },
    );
  }

  return Response.json({ ok: true });
}
