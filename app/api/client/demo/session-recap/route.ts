import { loadSampleSessionRecap } from "@/lib/sample-demo";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", recap: null }, { status: 503 });
  }

  const sessionRaw = new URL(request.url).searchParams.get("session");
  const sessionNumber = sessionRaw ? Math.round(Number(sessionRaw)) : NaN;
  if (!Number.isFinite(sessionNumber) || sessionNumber < 1) {
    return Response.json({ error: "session required.", recap: null }, { status: 400 });
  }

  try {
    const recap = await loadSampleSessionRecap(sessionNumber);
    return Response.json({ recap });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), recap: null },
      { status: 500 },
    );
  }
}
