import { adminApiGuard } from "@/lib/admin-route";
import { getSessionRecap, saveSessionRecap } from "@/lib/session-recap";
import { formatConvexError } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await adminApiGuard(request, "viewer");
  if (denied) return denied;

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
  const denied = await adminApiGuard(request, "editor");
  if (denied) return denied;

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
