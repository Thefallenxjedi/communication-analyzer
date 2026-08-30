import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TEXT_MAX = 12000;
const TITLE_MAX = 200;

const titledItem = v.object({ title: v.string(), body: v.string() });
const osItem = v.object({
  name: v.string(),
  goal: v.string(),
  body: v.string(),
});

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function normalizeTitled(
  items: { title: string; body: string }[] | undefined,
) {
  return (items ?? [])
    .map((item) => ({
      title: clip(item.title, TITLE_MAX),
      body: clip(item.body, TEXT_MAX),
    }))
    .filter((item) => item.title || item.body)
    .slice(0, 20);
}

function normalizeOs(
  items: { name: string; goal: string; body: string }[] | undefined,
) {
  return (items ?? [])
    .map((item) => ({
      name: clip(item.name, TITLE_MAX),
      goal: clip(item.goal, TITLE_MAX),
      body: clip(item.body, TEXT_MAX),
    }))
    .filter((item) => item.name || item.goal || item.body)
    .slice(0, 12);
}

function toView(row: {
  _id: string;
  clientId: string;
  summary: string;
  challenges: { title: string; body: string }[];
  coachingSchedule: string;
  osItems: { name: string; goal: string; body: string }[];
  reps: { title: string; body: string }[];
  updatedAt: number;
}) {
  return {
    id: row._id,
    clientId: row.clientId,
    summary: row.summary,
    challenges: row.challenges,
    coachingSchedule: row.coachingSchedule,
    osItems: row.osItems,
    reps: row.reps,
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("introCallReports")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    return row ? toView(row) : null;
  },
});

export const upsert = mutation({
  args: {
    clientId: v.id("clients"),
    summary: v.string(),
    challenges: v.array(titledItem),
    coachingSchedule: v.string(),
    osItems: v.array(osItem),
    reps: v.array(titledItem),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const now = Date.now();
    const fields = {
      summary: clip(args.summary, TEXT_MAX),
      challenges: normalizeTitled(args.challenges),
      coachingSchedule: clip(args.coachingSchedule, TEXT_MAX),
      osItems: normalizeOs(args.osItems),
      reps: normalizeTitled(args.reps),
      updatedAt: now,
    };

    const existing = await ctx.db
      .query("introCallReports")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return { ok: true as const, id: existing._id };
    }

    const id = await ctx.db.insert("introCallReports", {
      clientId: args.clientId,
      ...fields,
    });
    return { ok: true as const, id };
  },
});
