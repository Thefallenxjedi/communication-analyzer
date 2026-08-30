import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TITLE_MAX = 120;
const BODY_MAX = 2000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("promptAddOns")
      .withIndex("by_createdAt")
      .order("desc")
      .take(100);

    return rows.map((row) => ({
      id: row._id,
      title: row.title,
      body: row.body,
      enabled: row.enabled,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  },
});

/** Enabled add-ons in chronological order for the diagnosis prompt. */
export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("promptAddOns")
      .withIndex("by_enabled_createdAt", (q) => q.eq("enabled", true))
      .order("asc")
      .take(50);

    return rows.map((row) => ({
      id: row._id,
      title: row.title,
      body: row.body,
    }));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const title = args.title.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
    const body = args.body.trim().slice(0, BODY_MAX);
    if (!title) throw new Error("title required");
    if (!body) throw new Error("body required");

    const now = Date.now();
    const id = await ctx.db.insert("promptAddOns", {
      title,
      body,
      enabled: args.enabled !== false,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const, id };
  },
});

export const update = mutation({
  args: {
    id: v.id("promptAddOns"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };

    const patch: {
      title?: string;
      body?: string;
      enabled?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (typeof args.title === "string") {
      const title = args.title.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
      if (!title) throw new Error("title required");
      patch.title = title;
    }
    if (typeof args.body === "string") {
      const body = args.body.trim().slice(0, BODY_MAX);
      if (!body) throw new Error("body required");
      patch.body = body;
    }
    if (typeof args.enabled === "boolean") {
      patch.enabled = args.enabled;
    }

    await ctx.db.patch(args.id, patch);
    return { ok: true as const };
  },
});

export const setEnabled = mutation({
  args: {
    id: v.id("promptAddOns"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    await ctx.db.patch(args.id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const remove = mutation({
  args: { id: v.id("promptAddOns") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});
