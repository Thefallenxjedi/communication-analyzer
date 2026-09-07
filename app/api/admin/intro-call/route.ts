import {
  getIntroCallReport,
  saveIntroCallReport,
  type IntroCallChallenge,
  type IntroCallOsItem,
  type IntroCallRep,
} from "@/lib/intro-call";
import { formatConvexError } from "@/lib/convex-server";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  try {
    const report = await getIntroCallReport(clientId, convex);
    return Response.json({ report });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

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
  }, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not save intro call." },
      { status: 400 },
    );
  }
  const report = await getIntroCallReport(body.clientId, convex);
  return Response.json({ ok: true, report });
}
