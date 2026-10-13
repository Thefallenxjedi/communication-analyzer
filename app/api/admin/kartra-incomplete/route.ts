import {
  listIncompleteForKartra,
  markKartraIncompleteSynced,
} from "@/lib/analyses";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import {
  incompleteListName,
  isKartraConfigured,
  syncIncompleteLeadToKartra,
} from "@/lib/kartra";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 20;
const CONCURRENCY = 4;

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }

  try {
    const queue = await listIncompleteForKartra(convex);
    return Response.json({
      listName: incompleteListName(),
      kartraConfigured: isKartraConfigured(),
      pending: queue.pending.length,
      alreadySent: queue.alreadySent,
      skippedCompleted: queue.skippedCompleted,
    });
  } catch (err) {
    console.error("[admin/kartra-incomplete] GET", err);
    return Response.json(
      { error: `Could not load incomplete leads: ${formatConvexError(err)}` },
      { status: 500 },
    );
  }
}

/**
 * Push one batch of incomplete leads to the Kartra not-attempted list.
 * Body `{ exclude?: string[] }` skips emails that already failed this run,
 * so the client can keep calling until `remaining` is 0.
 */
export async function POST(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }
  if (!isKartraConfigured()) {
    return Response.json(
      { error: "Kartra is not configured (KARTRA_APP_ID / API key / password)." },
      { status: 503 },
    );
  }

  let exclude = new Set<string>();
  try {
    const body = (await request.json()) as { exclude?: unknown };
    if (Array.isArray(body.exclude)) {
      exclude = new Set(
        body.exclude
          .filter((e): e is string => typeof e === "string")
          .map((e) => e.trim().toLowerCase()),
      );
    }
  } catch {
    // no body
  }

  try {
    const queue = await listIncompleteForKartra(convex);
    const eligible = queue.pending.filter((l) => !exclude.has(l.email));
    const batch = eligible.slice(0, BATCH_SIZE);

    const sentIds: string[] = [];
    const failed: { email: string; message: string }[] = [];
    let sent = 0;

    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map((lead) =>
          syncIncompleteLeadToKartra({
            email: lead.email,
            firstName: lead.firstName,
          }),
        ),
      );
      results.forEach((result, j) => {
        const lead = chunk[j];
        if (result.ok) {
          sent += 1;
          sentIds.push(...lead.ids);
        } else {
          failed.push({
            email: lead.email,
            message: result.message || "Kartra request failed",
          });
        }
      });
    }

    await markKartraIncompleteSynced(sentIds, convex);

    return Response.json({
      ok: true,
      listName: incompleteListName(),
      sent,
      failed,
      remaining: Math.max(0, eligible.length - batch.length),
    });
  } catch (err) {
    console.error("[admin/kartra-incomplete] POST", err);
    return Response.json(
      { error: `Kartra sync failed: ${formatConvexError(err)}` },
      { status: 500 },
    );
  }
}
