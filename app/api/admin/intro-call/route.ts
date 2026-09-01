import { adminApiGuard } from "@/lib/admin-route";
import {
  getIntroCallReport,
  saveIntroCallReport,
  type IntroCallChallenge,
  type IntroCallOsItem,
  type IntroCallRep,
} from "@/lib/intro-call";
import { formatConvexError } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await adminApiGuard(request, "viewer");
  if (denied) return denied;

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
  const denied = await adminApiGuard(request, "editor");
  if (denied) return denied;

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
