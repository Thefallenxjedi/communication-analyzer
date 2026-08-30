import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import {
  getIntroCallReport,
  saveIntroCallReport,
  type IntroCallChallenge,
  type IntroCallOsItem,
  type IntroCallRep,
} from "@/lib/intro-call";
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
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  try {
    const report = await getIntroCallReport(clientId);
    return Response.json({ report });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
    summary?: string;
    challenges?: IntroCallChallenge[];
    coachingSchedule?: string;
    osItems?: IntroCallOsItem[];
    reps?: IntroCallRep[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.clientId?.trim()) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  const result = await saveIntroCallReport({
    clientId: body.clientId,
    summary: body.summary ?? "",
    challenges: body.challenges ?? [],
    coachingSchedule: body.coachingSchedule ?? "",
    osItems: body.osItems ?? [],
    reps: body.reps ?? [],
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save intro call." },
      { status: 400 },
    );
  }
  const report = await getIntroCallReport(body.clientId);
  return Response.json({ ok: true, report });
}
