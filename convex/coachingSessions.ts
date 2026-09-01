import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { FINAL_SESSION, SLOT_COUNT, isValidSessionNumber } from "./coachingProgram";

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
      };
    });
  },
});

export const markReady = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.number(),
  },
  handler: async (ctx, args) => {
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
      });
    }

    await ctx.db.patch(args.clientId, { lastActivityAt: now, updatedAt: now });
    return { ok: true as const };
  },
});
