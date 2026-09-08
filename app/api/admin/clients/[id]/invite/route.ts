import { getCoachingClient } from "@/lib/coaching-clients";
import { formatConvexError } from "@/lib/convex-server";
import { enrollAndInviteClient } from "@/lib/resend-invite";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

/**
 * POST /api/admin/clients/[id]/invite
 * Re-sends the custom Resend event so the welcome automation runs again.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "id required." }, { status: 400 });
  }

  try {
    const client = await getCoachingClient(id, convex);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }

    const invite = await enrollAndInviteClient({
      name: client.name,
      email: client.email,
    });

    return Response.json({ ok: true, invite });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) || "Could not resend invite." },
      { status: 500 },
    );
  }
}
