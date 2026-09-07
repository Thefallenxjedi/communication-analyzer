import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { isValidSessionNumber } from "./coachingProgram";

/** Mark a live coaching call as concluded (transcript/intro saved). */
export async function markCallCompleted(
  ctx: MutationCtx,
  clientId: Id<"clients">,
  sessionNumber: number,
  now: number,
) {
  if (!isValidSessionNumber(sessionNumber)) return;

  const existing = await ctx.db
    .query("coachingSessions")
    .withIndex("by_clientId_sessionNumber", (q) =>
      q.eq("clientId", clientId).eq("sessionNumber", sessionNumber),
    )
    .unique();

  if (existing) {
    if (existing.callCompletedAt) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return;
    }
    await ctx.db.patch(existing._id, {
      callCompletedAt: now,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("coachingSessions", {
    clientId,
    sessionNumber,
    ready: sessionNumber >= 1,
    callCompletedAt: now,
    updatedAt: now,
  });
}
