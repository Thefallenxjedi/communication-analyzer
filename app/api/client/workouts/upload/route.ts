import { getCoachingClientByEmail } from "@/lib/coaching-clients";
import { generateCoachingUploadUrl } from "@/lib/coaching-tasks";
import { readClientEmailFromCookie } from "@/lib/client-session";
import { isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const row = await getCoachingClientByEmail(email);
  if (!row) {
    return Response.json({ error: "Not enrolled." }, { status: 401 });
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
