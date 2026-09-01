import { adminApiGuard } from "@/lib/admin-route";
import { getCoachingClient } from "@/lib/coaching-clients";
import { FINAL_SESSION, INTRO_SESSION } from "@/lib/coaching-program";
import { getIntroCallReport } from "@/lib/intro-call";
import { formatConvexError } from "@/lib/convex-server";
import { generateWorkoutFromTranscript } from "@/lib/transcript-to-workout";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const denied = await adminApiGuard(request, "editor");
  if (denied) return denied;

  let body: {
    clientId?: string;
    transcript?: string;
    sourceSessionNumber?: number;
    targetSessionNumber?: number;
    mode?: "recap" | "tasks" | "both";
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
      mode: body.mode ?? "both",
    });

    return Response.json({ draft });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) },
      { status: 500 },
    );
  }
}
