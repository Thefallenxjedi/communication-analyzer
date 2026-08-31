import { getCoachingClientByEmail } from "@/lib/coaching-clients";
import {
  clearClientSessionCookie,
  clientSessionCookie,
  readClientEmailFromCookie,
  type ClientSession,
} from "@/lib/client-session";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

function toSession(row: {
  id: string;
  name: string;
  email: string;
  currentDay: number;
  programDays: number;
  currentFocus: string;
  meetingLink: string;
  status: ClientSession["status"];
  currentStage?: string;
  reviewRequired?: boolean;
  onboardingComplete?: boolean;
}): ClientSession {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    currentDay: row.currentDay,
    programDays: row.programDays,
    currentFocus: row.currentFocus,
    meetingLink: row.meetingLink,
    status: row.status,
    currentStage: row.currentStage || "Intro Call",
    reviewRequired: row.reviewRequired === true,
    onboardingComplete: row.onboardingComplete === true,
  };
}

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", client: null }, { status: 503 });
  }

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ client: null }, { status: 401 });
  }

  try {
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json(
        { error: "Session is no longer valid.", client: null },
        { status: 401, headers: { "set-cookie": clearClientSessionCookie() } },
      );
    }
    return Response.json({ client: toSession(row) });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), client: null },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }

  try {
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json(
        { error: "This email is not enrolled." },
        { status: 404 },
      );
    }
    return Response.json(
      { ok: true, client: toSession(row) },
      { headers: { "set-cookie": clientSessionCookie(row.email) } },
    );
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    { headers: { "set-cookie": clearClientSessionCookie() } },
  );
}
