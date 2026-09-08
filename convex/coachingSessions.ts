import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  MIN_WORK_SESSION_COUNT,
  MAX_WORK_SESSION_COUNT,
  finalSessionNumber,
  isMiddleWorkSession,
  isValidSessionNumber,
  liveCallSessions,
  normalizeWorkSessionCount,
  stageLabel,
  workAndFinalSlots,
} from "./coachingProgram";
import { markCallCompleted } from "./liveCalls";
import { requireStaffRole } from "./adminAccess";

function clientWorkCount(client: { workSessionCount?: number }): number {
  return normalizeWorkSessionCount(client.workSessionCount);
}

async function renumberSession(
  ctx: MutationCtx,
  clientId: Id<"clients">,
  from: number,
  to: number,
) {
  if (from === to) return;

  const sessionRow = await ctx.db
    .query("coachingSessions")
    .withIndex("by_clientId_sessionNumber", (q) =>
      q.eq("clientId", clientId).eq("sessionNumber", from),
    )
    .unique();
  if (sessionRow) {
    const conflict = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId_sessionNumber", (q) =>
        q.eq("clientId", clientId).eq("sessionNumber", to),
      )
      .unique();
    if (conflict) {
      await ctx.db.delete(conflict._id);
    }
    await ctx.db.patch(sessionRow._id, { sessionNumber: to, updatedAt: Date.now() });
  }

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", clientId))
    .take(500);
  for (const task of tasks) {
    if ((task.sessionNumber ?? 0) === from) {
      await ctx.db.patch(task._id, { sessionNumber: to, updatedAt: Date.now() });
    }
  }
}

async function deleteSessionContents(
  ctx: MutationCtx,
  clientId: Id<"clients">,
  sessionNumber: number,
) {
  const sessionRow = await ctx.db
    .query("coachingSessions")
    .withIndex("by_clientId_sessionNumber", (q) =>
      q.eq("clientId", clientId).eq("sessionNumber", sessionNumber),
    )
    .unique();
  if (sessionRow) {
    await ctx.db.delete(sessionRow._id);
  }

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", clientId))
    .take(500);
  for (const task of tasks) {
    if ((task.sessionNumber ?? 0) === sessionNumber) {
      await ctx.db.delete(task._id);
    }
  }
}

export const listForClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return [];

    const workCount = clientWorkCount(client);
    /** Work + Final only (Intro is handled separately in UI). */
    const slots = workAndFinalSlots(workCount);
    const rows = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", args.clientId))
      .take(200);

    /** Intro notes live on sessionNumber 0 — include for admin UIs. */
    const introRow = rows.find((item) => item.sessionNumber === 0);

    const mapped = slots.map((sessionNumber) => {
      const row = rows.find((item) => item.sessionNumber === sessionNumber);
      const taskCount = tasks.filter(
        (task) => (task.sessionNumber ?? 1) === sessionNumber,
      ).length;
      return {
        sessionNumber,
        ready: row?.ready === true,
        taskCount,
        callCompleted: Boolean(row?.callCompletedAt),
        callCompletedAt: row?.callCompletedAt
          ? new Date(row.callCompletedAt).toISOString()
          : "",
        adminNotes: row?.adminNotes ?? "",
      };
    });

    return [
      {
        sessionNumber: 0,
        ready: true,
        taskCount: tasks.filter((task) => (task.sessionNumber ?? 0) === 0)
          .length,
        callCompleted: Boolean(introRow?.callCompletedAt),
        callCompletedAt: introRow?.callCompletedAt
          ? new Date(introRow.callCompletedAt).toISOString()
          : "",
        adminNotes: introRow?.adminNotes ?? "",
      },
      ...mapped,
    ];
  },
});

export const getLiveCallProgress = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      return {
        total: LIVE_CALL_TOTAL_DEFAULT,
        completed: 0,
        remaining: LIVE_CALL_TOTAL_DEFAULT,
        calls: [] as {
          sessionNumber: number;
          label: string;
          completed: boolean;
          completedAt: string;
        }[],
      };
    }

    const workCount = clientWorkCount(client);
    const liveSessions = liveCallSessions(workCount);
    const rows = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();

    const calls = liveSessions.map((sessionNumber) => {
      const row = rows.find((item) => item.sessionNumber === sessionNumber);
      return {
        sessionNumber,
        label: stageLabel(sessionNumber, workCount),
        completed: Boolean(row?.callCompletedAt),
        completedAt: row?.callCompletedAt
          ? new Date(row.callCompletedAt).toISOString()
          : "",
      };
    });

    const completed = calls.filter((call) => call.completed).length;
    const total = liveSessions.length;
    return {
      total,
      completed,
      remaining: Math.max(0, total - completed),
      calls,
    };
  },
});

const LIVE_CALL_TOTAL_DEFAULT = 10;

export const markReady = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const workCount = clientWorkCount(client);
    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber, workCount) || sessionNumber < 1) {
      throw new Error("sessionNumber must be a work session or Final Call");
    }

    const final = finalSessionNumber(workCount);
    if (sessionNumber > 1 && sessionNumber !== final) {
      const prev = await ctx.db
        .query("coachingSessions")
        .withIndex("by_clientId_sessionNumber", (q) =>
          q.eq("clientId", args.clientId).eq("sessionNumber", sessionNumber - 1),
        )
        .unique();
      if (!prev?.ready) {
        throw new Error("Mark the previous session ready first.");
      }
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId_sessionNumber", (q) =>
        q.eq("clientId", args.clientId).eq("sessionNumber", sessionNumber),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ready: true, updatedAt: now });
    } else {
      await ctx.db.insert("coachingSessions", {
        clientId: args.clientId,
        sessionNumber,
        ready: true,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.clientId, { lastActivityAt: now, updatedAt: now });
    return { ok: true as const };
  },
});

const RECAP_MAX = 12_000;
const TRANSCRIPT_MAX = 80_000;
const NOTES_MAX = 20_000;

export const getRecap = query({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    const workCount = client ? clientWorkCount(client) : undefined;
    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber, workCount) || sessionNumber < 1) {
      return null;
    }
    const row = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId_sessionNumber", (q) =>
        q.eq("clientId", args.clientId).eq("sessionNumber", sessionNumber),
      )
      .unique();
    if (!row?.recapSummary?.trim()) return null;
    return {
      sessionNumber,
      recapSummary: row.recapSummary,
      recapUpdatedAt: row.recapUpdatedAt ?? row.updatedAt,
      sourceTranscript: row.sourceTranscript ?? undefined,
      callCompleted: Boolean(row.callCompletedAt),
      callCompletedAt: row.callCompletedAt
        ? new Date(row.callCompletedAt).toISOString()
        : "",
    };
  },
});

export const upsertRecap = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
    recapSummary: v.string(),
    sourceTranscript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const workCount = clientWorkCount(client);
    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber, workCount) || sessionNumber < 1) {
      throw new Error("sessionNumber must be a work session or Final Call");
    }

    const recapSummary = args.recapSummary.trim().slice(0, RECAP_MAX);
    if (!recapSummary) throw new Error("recapSummary required");

    const sourceTranscript = args.sourceTranscript?.trim().slice(0, TRANSCRIPT_MAX);
    const now = Date.now();
    /** Saving a session recap means the live call concluded. */
    const concludeCall = true;

    const existing = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId_sessionNumber", (q) =>
        q.eq("clientId", args.clientId).eq("sessionNumber", sessionNumber),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        recapSummary,
        ...(sourceTranscript !== undefined ? { sourceTranscript } : {}),
        recapUpdatedAt: now,
        updatedAt: now,
        ...(concludeCall && !existing.callCompletedAt
          ? { callCompletedAt: now }
          : {}),
      });
    } else {
      await ctx.db.insert("coachingSessions", {
        clientId: args.clientId,
        sessionNumber,
        ready: false,
        recapSummary,
        ...(sourceTranscript ? { sourceTranscript } : {}),
        recapUpdatedAt: now,
        updatedAt: now,
        ...(concludeCall ? { callCompletedAt: now } : {}),
      });
    }

    await ctx.db.patch(args.clientId, { lastActivityAt: now, updatedAt: now });
    return { ok: true as const };
  },
});

/** Mark Intro Call complete when admin saves the intro overview (or any live call). */
export const markLiveCallComplete = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const workCount = clientWorkCount(client);
    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber, workCount)) {
      throw new Error("invalid sessionNumber");
    }

    const now = Date.now();
    await markCallCompleted(ctx, args.clientId, sessionNumber, now);
    await ctx.db.patch(args.clientId, { lastActivityAt: now, updatedAt: now });
    return { ok: true as const };
  },
});

/** Add one middle work session before Final Call. */
export const addWorkSession = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const count = clientWorkCount(client);
    if (count >= MAX_WORK_SESSION_COUNT) {
      throw new Error(`At most ${MAX_WORK_SESSION_COUNT} work sessions.`);
    }

    const oldFinal = finalSessionNumber(count);
    const newCount = count + 1;
    const newFinal = finalSessionNumber(newCount);
    await renumberSession(ctx, args.clientId, oldFinal, newFinal);

    const now = Date.now();
    await ctx.db.patch(args.clientId, {
      workSessionCount: newCount,
      lastActivityAt: now,
      updatedAt: now,
    });
    return { ok: true as const, workSessionCount: newCount };
  },
});

/**
 * Remove a middle work session. Higher sessions (and Final) shift down by one.
 * Deletes that session's tasks and recap.
 */
export const removeWorkSession = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const count = clientWorkCount(client);
    if (count <= MIN_WORK_SESSION_COUNT) {
      throw new Error(`At least ${MIN_WORK_SESSION_COUNT} work session required.`);
    }

    const sessionNumber = Math.round(args.sessionNumber);
    if (!isMiddleWorkSession(sessionNumber, count)) {
      throw new Error("Only middle work sessions can be removed.");
    }

    await deleteSessionContents(ctx, args.clientId, sessionNumber);

    const oldFinal = finalSessionNumber(count);
    for (let n = sessionNumber + 1; n <= oldFinal; n++) {
      await renumberSession(ctx, args.clientId, n, n - 1);
    }

    const newCount = count - 1;
    const now = Date.now();
    await ctx.db.patch(args.clientId, {
      workSessionCount: newCount,
      lastActivityAt: now,
      updatedAt: now,
    });
    return { ok: true as const, workSessionCount: newCount };
  },
});

export const setAdminNotes = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
    adminNotes: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const workCount = clientWorkCount(client);
    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber, workCount)) {
      throw new Error("invalid sessionNumber");
    }

    const adminNotes = args.adminNotes.trim().slice(0, NOTES_MAX);
    const now = Date.now();
    const existing = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId_sessionNumber", (q) =>
        q.eq("clientId", args.clientId).eq("sessionNumber", sessionNumber),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { adminNotes, updatedAt: now });
    } else {
      await ctx.db.insert("coachingSessions", {
        clientId: args.clientId,
        sessionNumber,
        ready: false,
        adminNotes,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.clientId, { lastActivityAt: now, updatedAt: now });
    return { ok: true as const };
  },
});
