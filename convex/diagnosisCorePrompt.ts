import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const CORE_KEY = "diagnosis";
const BODY_MAX = 80_000;

export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("diagnosisCorePrompt")
      .withIndex("by_key", (q) => q.eq("key", CORE_KEY))
      .first();
    if (!row || !row.body.trim()) {
      return {
        body: null as string | null,
        isOverride: false,
        updatedAt: null as string | null,
      };
    }
    return {
      body: row.body,
      isOverride: true,
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  },
});

export const set = mutation({
  args: { body: v.string() },
  handler: async (ctx, args) => {
    const body = args.body.trim().slice(0, BODY_MAX);
    if (body.length < 200) {
      throw new Error("Core prompt is too short — paste the full system prompt.");
    }

    const existing = await ctx.db
      .query("diagnosisCorePrompt")
      .withIndex("by_key", (q) => q.eq("key", CORE_KEY))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { body, updatedAt: now });
    } else {
      await ctx.db.insert("diagnosisCorePrompt", {
        key: CORE_KEY,
        body,
        updatedAt: now,
      });
    }
    return { ok: true as const, isOverride: true };
  },
});

/** Clear override so analyze falls back to code DIAGNOSIS_PROMPT. */
export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("diagnosisCorePrompt")
      .withIndex("by_key", (q) => q.eq("key", CORE_KEY))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true as const, isOverride: false };
  },
});
