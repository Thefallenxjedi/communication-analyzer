import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  FINAL_SESSION,
  LIVE_CALL_SESSIONS,
  LIVE_CALL_TOTAL,
  SLOT_COUNT,
  isValidSessionNumber,
  stageLabel,
} from "./coachingProgram";
import { markCallCompleted } from "./liveCalls";
import { requireStaffRole } from "./adminAccess";

export const listForClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return [];

    const rows = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", args.clientId))
      .take(200);

    return Array.from({ length: SLOT_COUNT }, (_, i) => {
      const sessionNumber = i + 1;
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
      };
    });
  },
});

export const getLiveCallProgress = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      return {
        total: LIVE_CALL_TOTAL,
        completed: 0,
        remaining: LIVE_CALL_TOTAL,
        calls: [] as {
          sessionNumber: number;
          label: string;
          completed: boolean;
          completedAt: string;
        }[],
      };
    }

    const rows = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();

    const calls = LIVE_CALL_SESSIONS.map((sessionNumber) => {
      const row = rows.find((item) => item.sessionNumber === sessionNumber);
      return {
        sessionNumber,
        label: stageLabel(sessionNumber),
        completed: Boolean(row?.callCompletedAt),
        completedAt: row?.callCompletedAt
          ? new Date(row.callCompletedAt).toISOString()
          : "",
      };
    });

    const completed = calls.filter((call) => call.completed).length;
    return {
      total: LIVE_CALL_TOTAL,
      completed,
      remaining: Math.max(0, LIVE_CALL_TOTAL - completed),
      calls,
    };
  },
});

export const markReady = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber) || sessionNumber < 1) {
      throw new Error("sessionNumber must be 1–9 or Final Call");
    }

    if (sessionNumber > 1 && sessionNumber !== FINAL_SESSION) {
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

export const getRecap = query({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber) || sessionNumber < 1) {
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

    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber) || sessionNumber < 1) {
      throw new Error("sessionNumber must be 1–9 or Final Call");
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

    const sessionNumber = Math.round(args.sessionNumber);
    if (!isValidSessionNumber(sessionNumber)) {
      throw new Error("invalid sessionNumber");
    }

    const now = Date.now();
    await markCallCompleted(ctx, args.clientId, sessionNumber, now);
    await ctx.db.patch(args.clientId, { lastActivityAt: now, updatedAt: now });
    return { ok: true as const };
  },
});
