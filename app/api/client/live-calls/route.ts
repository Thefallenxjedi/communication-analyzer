import { getActiveClientSession } from "@/lib/client-auth";
import {
  emptyLiveCallProgress,
  getLiveCallProgress,
} from "@/lib/coaching-sessions";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET() {
  if (!isConvexConfigured()) {
    return Response.json(
      { error: "Not configured.", progress: emptyLiveCallProgress() },
      { status: 503 },
    );
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json(
      { error: "Not signed in.", progress: emptyLiveCallProgress() },
      { status: 401 },
    );
  }

  try {
    const progress = await getLiveCallProgress(active.client.id);
    return Response.json({ progress });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), progress: emptyLiveCallProgress() },
      { status: 500 },
    );
  }
}
