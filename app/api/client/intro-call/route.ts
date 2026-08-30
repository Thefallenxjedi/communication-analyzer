import { getCoachingClientByEmail } from "@/lib/coaching-clients";
import { getIntroCallReport } from "@/lib/intro-call";
import { readClientEmailFromCookie } from "@/lib/client-session";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", report: null }, { status: 503 });
  }

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ error: "Not signed in.", report: null }, { status: 401 });
  }

  try {
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json({ error: "Not enrolled.", report: null }, { status: 401 });
    }
    const report = await getIntroCallReport(row.id);
    return Response.json({ report });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), report: null },
      { status: 500 },
    );
  }
}
