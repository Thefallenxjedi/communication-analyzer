import { loadSampleDemoBundle } from "@/lib/sample-demo";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import { emptyLiveCallProgress } from "@/lib/coaching-sessions";

export const runtime = "nodejs";

export async function GET() {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  try {
    const bundle = await loadSampleDemoBundle();
    if (!bundle) {
      return Response.json(
        { error: "Sample demo is not available." },
        { status: 503 },
      );
    }
    return Response.json({
      ...bundle,
      progress: bundle.progress ?? emptyLiveCallProgress(),
    });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) },
      { status: 500 },
    );
  }
}
