import { getActiveClientSession } from "@/lib/client-auth";
import { generateCoachingUploadUrl } from "@/lib/coaching-tasks";
import { isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function POST() {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const result = await generateCoachingUploadUrl();
  if (!result.ok || !result.uploadUrl) {
    return Response.json(
      { error: result.error || "Could not start upload." },
      { status: 500 },
    );
  }
  return Response.json({ uploadUrl: result.uploadUrl });
}
