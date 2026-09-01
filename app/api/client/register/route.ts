import { getAuthedConvexClient } from "@/lib/client-auth";
import { coachingApi, formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  if (!name) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  const convex = await getAuthedConvexClient();
  if (!convex) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const result = (await convex.mutation(coachingApi.registerClientSignup, {
      name,
    })) as { ok?: boolean; error?: string };
    if (!result?.ok) {
      return Response.json({ error: "Could not register." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
