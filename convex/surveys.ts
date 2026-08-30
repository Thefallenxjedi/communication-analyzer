import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const submit = mutation({
  args: {
    rating: v.number(),
    comment: v.optional(v.string()),
    anonymousId: v.optional(v.string()),
    reportSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rating = Math.round(args.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error("rating must be 1–5");
    }

    const reportSlug = args.reportSlug?.trim().toLowerCase().slice(0, 32) || "";
    const anonymousId = args.anonymousId?.trim().slice(0, 128) || "";
    const comment = args.comment?.replace(/\s+/g, " ").trim().slice(0, 500) || "";

    if (reportSlug) {
      const existing = await ctx.db
        .query("surveyRatings")
        .withIndex("by_reportSlug", (q) => q.eq("reportSlug", reportSlug))
        .first();
      if (existing) {
        return { ok: false as const, reason: "already_rated" as const };
      }
    }

    await ctx.db.insert("surveyRatings", {
      rating,
      ...(comment ? { comment } : {}),
      ...(anonymousId ? { anonymousId } : {}),
      ...(reportSlug ? { reportSlug } : {}),
      createdAt: Date.now(),
    });

    return { ok: true as const };
  },
});

export const hasRated = query({
  args: { reportSlug: v.string() },
  handler: async (ctx, args) => {
    const reportSlug = args.reportSlug.trim().toLowerCase().slice(0, 32);
    if (!reportSlug) return false;
    const existing = await ctx.db
      .query("surveyRatings")
      .withIndex("by_reportSlug", (q) => q.eq("reportSlug", reportSlug))
      .first();
    return Boolean(existing);
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(100, Math.max(1, args.limit ?? 20));
    const rows = await ctx.db
      .query("surveyRatings")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    return rows.map((row) => ({
      id: row._id,
      rating: row.rating,
      comment: row.comment || "",
      anonymousId: row.anonymousId || "",
      reportSlug: row.reportSlug || "",
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  },
});

export const getStats = query({
  args: {
    fromMs: v.optional(v.number()),
    toMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("surveyRatings")
      .withIndex("by_createdAt")
      .order("desc")
      .take(2000);

    const fromMs =
      typeof args.fromMs === "number" && Number.isFinite(args.fromMs)
        ? args.fromMs
        : null;
    const toMs =
      typeof args.toMs === "number" && Number.isFinite(args.toMs)
        ? args.toMs
        : null;

    const filtered = rows.filter((r) => {
      if (fromMs != null && r.createdAt < fromMs) return false;
      if (toMs != null && r.createdAt > toMs) return false;
      return true;
    });

    const count = filtered.length;
    const avgRating =
      count === 0
        ? null
        : Math.round(
            (filtered.reduce((sum, r) => sum + r.rating, 0) / count) * 10,
          ) / 10;

    return {
      count,
      avgRating,
      recent: filtered.slice(0, 20).map((row) => ({
        id: row._id,
        rating: row.rating,
        comment: row.comment || "",
        reportSlug: row.reportSlug || "",
        createdAt: new Date(row.createdAt).toISOString(),
      })),
    };
  },
});

/** Map reportSlug → latest rating for admin table join. */
export const ratingsBySlugs = query({
  args: { slugs: v.array(v.string()) },
  handler: async (ctx, args) => {
    const unique = [
      ...new Set(
        args.slugs
          .map((s) => s.trim().toLowerCase().slice(0, 32))
          .filter(Boolean),
      ),
    ].slice(0, 200);

    const out: Record<string, { rating: number; comment: string }> = {};
    for (const slug of unique) {
      const row = await ctx.db
        .query("surveyRatings")
        .withIndex("by_reportSlug", (q) => q.eq("reportSlug", slug))
        .first();
      if (row) {
        out[slug] = { rating: row.rating, comment: row.comment || "" };
      }
    }
    return out;
  },
});
