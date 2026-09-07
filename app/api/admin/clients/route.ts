import {
  createCoachingClient,
  getCoachingClientByEmail,
  listCoachingClients,
  removeCoachingClient,
  updateCoachingClient,
  type CoachingClientStatus,
} from "@/lib/coaching-clients";
import { formatConvexError } from "@/lib/convex-server";
import {
  enrollAndInviteClient,
  type ClientInviteResult,
} from "@/lib/resend-invite";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  try {
    const clients = await listCoachingClients(convex);
    return Response.json({ clients });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), clients: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

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

  const name = body.name ?? "";
  const email = body.email ?? "";

  try {
    const result = await createCoachingClient({
      name,
      email,
      startDate: body.startDate,
      currentFocus: body.currentFocus,
      meetingLink: body.meetingLink,
    }, convex);

    let clientId = result.id;
    let alreadyExisted = Boolean(result.alreadyExisted);

    if (!result.ok || !clientId) {
      const existing = await getCoachingClientByEmail(email, convex);
      if (!existing) {
        return Response.json(
          { error: result.error || "Could not create client." },
          { status: 400 },
        );
      }
      clientId = existing.id;
      alreadyExisted = true;
    }

    let invite: ClientInviteResult = {
      configured: false,
      sent: false,
      enrolled: false,
    };
    try {
      invite = await enrollAndInviteClient({ name, email });
    } catch (err) {
      invite = {
        configured: true,
        sent: false,
        enrolled: false,
        error: formatConvexError(err) || "Could not send welcome email.",
      };
    }

    const clients = await listCoachingClients(convex);
    return Response.json({
      ok: true,
      accessGranted: true,
      id: clientId,
      alreadyExisted,
      clients,
      invite,
    });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) || "Could not create client." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

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
  }, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not update client." },
      { status: 400 },
    );
  }
  const clients = await listCoachingClients(convex);
  return Response.json({ ok: true, clients });
}

export async function DELETE(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() || "";
  if (!id) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  const result = await removeCoachingClient(id, convex);
  if (!result.ok) {
    return Response.json(
      { error: result.error || "Could not delete client." },
      { status: 400 },
    );
  }
  const clients = await listCoachingClients(convex);
  return Response.json({ ok: true, clients });
}
