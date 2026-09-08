import { getCoachingClient } from "@/lib/coaching-clients";
import { isValidSessionNumber } from "@/lib/coaching-program";
import { formatConvexError } from "@/lib/convex-server";
import { sendSessionCompletedEvent } from "@/lib/resend-invite";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";

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

  let body: { sessionNumber?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const client = await getCoachingClient(id, convex);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }

    const sessionNumber = Math.round(body.sessionNumber ?? Number.NaN);
    if (
      !Number.isFinite(sessionNumber) ||
      !isValidSessionNumber(sessionNumber, client.workSessionCount)
    ) {
      return Response.json(
        { error: "Valid sessionNumber required." },
        { status: 400 },
      );
    }

    const event = await sendSessionCompletedEvent({
      name: client.name,
      email: client.email,
      sessionNumber,
    });
    if (!event.sent) {
      return Response.json(
        {
          error:
            event.error ||
            (event.configured
              ? "Session completion automation was not triggered."
              : "Resend is not configured."),
          event,
        },
        { status: 502 },
      );
    }

    return Response.json({ ok: true, event });
  } catch (err) {
    return Response.json(
      {
        error:
          formatConvexError(err) ||
          "Could not trigger the session completion automation.",
      },
      { status: 500 },
    );
  }
}
