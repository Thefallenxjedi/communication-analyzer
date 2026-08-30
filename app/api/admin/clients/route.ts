import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import {
  createCoachingClient,
  listCoachingClients,
  removeCoachingClient,
  updateCoachingClient,
  type CoachingClientStatus,
} from "@/lib/coaching-clients";
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
    return Response.json(
      { error: "Convex is not configured.", clients: [] },
      { status: 503 },
    );
  }

  try {
    const clients = await listCoachingClients();
    return Response.json({ clients });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), clients: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = adminGate();
  if (denied) return denied;
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  let body: {
    name?: string;
    email?: string;
    startDate?: string;
    currentFocus?: string;
    meetingLink?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const result = await createCoachingClient({
    name: body.name ?? "",
    email: body.email ?? "",
    startDate: body.startDate,
    currentFocus: body.currentFocus,
    meetingLink: body.meetingLink,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not create client." },
      { status: 400 },
    );
  }
  const clients = await listCoachingClients();
  return Response.json({ ok: true, id: result.id, clients });
}

export async function PATCH(request: Request) {
  const denied = adminGate();
  if (denied) return denied;
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  let body: {
    id?: string;
    currentFocus?: string;
    status?: CoachingClientStatus;
    startDate?: string;
    meetingLink?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.id?.trim()) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  const result = await updateCoachingClient({
    id: body.id,
    currentFocus: body.currentFocus,
    status: body.status,
    startDate: body.startDate,
    meetingLink: body.meetingLink,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not update client." },
      { status: 400 },
    );
  }
  const clients = await listCoachingClients();
  return Response.json({ ok: true, clients });
}

export async function DELETE(request: Request) {
  const denied = adminGate();
  if (denied) return denied;
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() || "";
  if (!id) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  const result = await removeCoachingClient(id);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not delete client." },
      { status: 400 },
    );
  }
  const clients = await listCoachingClients();
  return Response.json({ ok: true, clients });
}
