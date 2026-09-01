import {
  fetchMyClientFromConvex,
  getActiveClientSession,
} from "@/lib/client-auth";
import type { ClientSession } from "@/lib/client-session";
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

export async function GET() {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", authenticated: false }, { status: 503 });
  }

  try {
    const data = await fetchMyClientFromConvex();
    if (!data.authenticated) {
      return Response.json({ authenticated: false, client: null }, { status: 401 });
    }

    if (data.needsRegistration) {
      return Response.json({
        authenticated: true,
        needsRegistration: true,
        client: null,
      });
    }

    if (!data.client) {
      return Response.json({
        authenticated: true,
        needsRegistration: true,
        client: null,
      });
    }

    return Response.json({
      authenticated: true,
      needsRegistration: false,
      client: toSession(data.client),
    });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), authenticated: false, client: null },
      { status: 500 },
    );
  }
}

/** Legacy email login removed — use Google via Convex Auth. */
export async function POST() {
  return Response.json(
    { error: "Use Sign in with Google on the client login page." },
    { status: 400 },
  );
}

export async function DELETE() {
  return Response.json({ ok: true });
}

export async function requireActiveClient() {
  const active = await getActiveClientSession();
  return active;
}
