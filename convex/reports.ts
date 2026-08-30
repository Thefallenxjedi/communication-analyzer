import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function makeSlug(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length]!;
  }
  return out;
}

async function uniqueSlug(ctx: MutationCtx, attempts = 8): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const slug = makeSlug(12);
    const existing = await ctx.db
      .query("sharedReports")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!existing) return slug;
  }
  return makeSlug(16);
}

/** Create a shareable report link (no automatic expiry). */
export const create = mutation({
  args: {
    reportJson: v.string(),
    anonymousId: v.string(),
    overallScore: v.number(),
    level: v.string(),
    mainFocus: v.string(),
    firstName: v.optional(v.string()),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const anonymousId = args.anonymousId.trim().slice(0, 128);
    if (!anonymousId) throw new Error("anonymousId required");
    const reportJson = args.reportJson.slice(0, 500_000);
    if (!reportJson) throw new Error("reportJson required");

    const now = Date.now();
    const slug = await uniqueSlug(ctx);

    await ctx.db.insert("sharedReports", {
      slug,
      reportJson,
      anonymousId,
      overallScore: Math.round(args.overallScore),
      level: args.level.slice(0, 120),
      mainFocus: args.mainFocus.slice(0, 200),
      firstName: args.firstName?.trim().slice(0, 80) || undefined,
      email: args.email?.trim().toLowerCase().slice(0, 200) || undefined,
      source: args.source?.slice(0, 64) || undefined,
      createdAt: now,
      expiresAt: Number.MAX_SAFE_INTEGER,
    });

    return {
      slug,
      path: `/r/${slug}`,
    };
  },
});

/** Public fetch by slug. Returns null if missing. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = args.slug.trim().toLowerCase().slice(0, 32);
    if (!slug) return null;

    const row = await ctx.db
      .query("sharedReports")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!row) return null;

    let report: unknown = null;
    try {
      report = JSON.parse(row.reportJson);
    } catch {
      return null;
    }

    return {
      slug: row.slug,
      report,
      overallScore: row.overallScore,
      level: row.level,
      mainFocus: row.mainFocus,
      firstName: row.firstName || "",
      email: row.email || "",
      createdAt: row.createdAt,
    };
  },
});
