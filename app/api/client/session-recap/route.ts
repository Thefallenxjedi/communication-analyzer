import { getCoachingClientByEmail } from "@/lib/coaching-clients";
import { readClientEmailFromCookie } from "@/lib/client-session";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import { getSessionRecap } from "@/lib/session-recap";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", recap: null }, { status: 503 });
  }

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ error: "Not signed in.", recap: null }, { status: 401 });
  }

  const sessionRaw = new URL(request.url).searchParams.get("session");
  const sessionNumber = sessionRaw ? Math.round(Number(sessionRaw)) : NaN;
  if (!Number.isFinite(sessionNumber) || sessionNumber < 1) {
    return Response.json({ error: "session required.", recap: null }, { status: 400 });
  }

  try {
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json({ error: "Not enrolled.", recap: null }, { status: 401 });
    }
    const recap = await getSessionRecap({
      clientId: row.id,
      sessionNumber,
    });
    return Response.json({ recap });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), recap: null },
      { status: 500 },
    );
  }
}
