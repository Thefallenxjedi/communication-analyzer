import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStaffRole } from "./adminAccess";

const BODY_MAX = 40_000;

const promptKey = v.union(
  v.literal("shared"),
  v.literal("summary"),
  v.literal("tasks"),
);

export const get = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("transcriptPrompts").collect();
    const map = new Map(rows.map((row) => [row.key, row]));
    return {
      shared: map.get("shared")
        ? {
            body: map.get("shared")!.body,
            updatedAt: new Date(map.get("shared")!.updatedAt).toISOString(),
          }
        : null,
      summary: map.get("summary")
        ? {
            body: map.get("summary")!.body,
            updatedAt: new Date(map.get("summary")!.updatedAt).toISOString(),
          }
        : null,
      tasks: map.get("tasks")
        ? {
            body: map.get("tasks")!.body,
            updatedAt: new Date(map.get("tasks")!.updatedAt).toISOString(),
          }
        : null,
    };
  },
});

export const set = mutation({
  args: {
    key: promptKey,
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");

    const body = args.body.trim().slice(0, BODY_MAX);
    if (body.length < 40) {
      throw new Error("Prompt is too short.");
    }

    const existing = await ctx.db
      .query("transcriptPrompts")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { body, updatedAt: now });
    } else {
      await ctx.db.insert("transcriptPrompts", {
        key: args.key,
        body,
        updatedAt: now,
      });
    }
    return { ok: true as const };
  },
});

export const clear = mutation({
  args: {
    key: promptKey,
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");

    const existing = await ctx.db
      .query("transcriptPrompts")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true as const };
  },
});
