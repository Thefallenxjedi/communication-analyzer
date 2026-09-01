import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { coachingApi, formatConvexError, getConvexHttpClient, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json({ error: "ADMIN_PASSWORD is not configured." }, { status: 503 });
  }
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured.", clients: [] }, { status: 503 });
  }

  const client = getConvexHttpClient();
  if (!client) {
    return Response.json({ error: "Convex is not configured.", clients: [] }, { status: 503 });
  }

  try {
    const clients = await client.query(coachingApi.listPendingClients, {});
    return Response.json({ clients });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), clients: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json({ error: "ADMIN_PASSWORD is not configured." }, { status: 503 });
  }
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  let body: { clientId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  if (!clientId) {
    return Response.json({ error: "clientId required." }, { status: 400 });
  }

  const client = getConvexHttpClient();
  if (!client) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  try {
    await client.mutation(coachingApi.approveClientSignup, {
      id: clientId as never,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
