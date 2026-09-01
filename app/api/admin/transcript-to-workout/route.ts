import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { getCoachingClient } from "@/lib/coaching-clients";
import { FINAL_SESSION, INTRO_SESSION } from "@/lib/coaching-program";
import { getIntroCallReport } from "@/lib/intro-call";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import { generateWorkoutFromTranscript } from "@/lib/transcript-to-workout";

export const runtime = "nodejs";
export const maxDuration = 120;

function adminGate() {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured." },
      { status: 503 },
    );
  }
  return null;
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
    transcript?: string;
    sourceSessionNumber?: number;
    targetSessionNumber?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const clientId = body.clientId?.trim() || "";
  const transcript = body.transcript?.trim() || "";
  const sourceSessionNumber = Math.round(body.sourceSessionNumber ?? 0);
  const targetSessionNumber = Math.round(body.targetSessionNumber ?? 0);

  if (!clientId) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }
  if (!transcript) {
    return Response.json({ error: "transcript required." }, { status: 400 });
  }
  if (
    sourceSessionNumber < 1 ||
    sourceSessionNumber > FINAL_SESSION ||
    sourceSessionNumber === INTRO_SESSION
  ) {
    return Response.json(
      { error: "sourceSessionNumber must be Session 1–9 or Final Call." },
      { status: 400 },
    );
  }
  if (
    targetSessionNumber < 1 ||
    targetSessionNumber > FINAL_SESSION ||
    targetSessionNumber === INTRO_SESSION
  ) {
    return Response.json(
      { error: "targetSessionNumber must be Session 1–9 or Final Call." },
      { status: 400 },
    );
  }

  try {
    const client = await getCoachingClient(clientId);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }

    const intro = await getIntroCallReport(clientId);
    const draft = await generateWorkoutFromTranscript({
      transcript,
      sourceSessionNumber,
      targetSessionNumber,
      clientName: client.name,
      currentFocus: client.currentFocus,
      introSummary: intro?.summary,
      introChallenges: intro?.challenges
        .map((c) => c.title)
        .filter(Boolean),
    });

    return Response.json({ draft });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) },
      { status: 500 },
    );
  }
}
