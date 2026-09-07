import { getCoachingClient } from "@/lib/coaching-clients";
import { coachingApi, formatConvexError } from "@/lib/convex-server";
import { enrollAndInviteClient } from "@/lib/resend-invite";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const client = await requireStaffConvex(request, "viewer");
  if (client instanceof Response) return client;

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
  const client = await requireStaffConvex(request, "editor");
  if (client instanceof Response) return client;

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

  try {
    await client.mutation(coachingApi.approveClientSignup, {
      id: clientId as never,
    });
    const approved = await getCoachingClient(clientId, client);
    let invite;
    try {
      invite = approved
        ? await enrollAndInviteClient({
            name: approved.name,
            email: approved.email,
          })
        : {
            configured: false,
            sent: false,
            enrolled: false,
            error: "Approved, but could not load the client for the invite.",
          };
    } catch (inviteErr) {
      invite = {
        configured: true,
        sent: false,
        enrolled: false,
        error: formatConvexError(inviteErr) || "Could not send welcome email.",
      };
    }
    return Response.json({ ok: true, invite });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
