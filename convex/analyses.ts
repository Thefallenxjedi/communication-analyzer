import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const insert = mutation({
  args: {
    anonymousId: v.string(),
    overallScore: v.number(),
    durationSec: v.union(v.number(), v.null()),
    level: v.string(),
    mainFocus: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const anonymousId = args.anonymousId.trim().slice(0, 128);
    if (!anonymousId) throw new Error("anonymousId required");

    const id = await ctx.db.insert("analyses", {
      anonymousId,
      overallScore: Math.round(args.overallScore),
      durationSec:
        args.durationSec != null && Number.isFinite(args.durationSec)
          ? Math.round(args.durationSec)
          : null,
      level: args.level.slice(0, 120),
      mainFocus: args.mainFocus.slice(0, 200),
      source: args.source?.slice(0, 64),
      createdAt: Date.now(),
    });
    return id;
  },
});

/** Attach name + email to the latest analysis for this browser (PDF / homepage gate). */
export const attachLead = mutation({
  args: {
    anonymousId: v.string(),
    firstName: v.string(),
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const anonymousId = args.anonymousId.trim().slice(0, 128);
    const firstName = args.firstName.trim().slice(0, 80);
    const email = args.email.trim().toLowerCase().slice(0, 200);
    const source = (args.source || "opt-in").trim().slice(0, 64);
    if (!anonymousId || !firstName || !email) {
      throw new Error("anonymousId, firstName, and email are required");
    }

    const latest = await ctx.db
      .query("analyses")
      .withIndex("by_anonymousId_createdAt", (q) =>
        q.eq("anonymousId", anonymousId),
      )
      .order("desc")
      .first();

    if (latest) {
      await ctx.db.patch(latest._id, { firstName, email });
      return { ok: true as const, id: latest._id, patched: true };
    }

    // No analysis yet — store an incomplete lead so admin can see drop-offs
    const id = await ctx.db.insert("analyses", {
      anonymousId,
      overallScore: 0,
      durationSec: null,
      level: "",
      mainFocus: "",
      source,
      firstName,
      email,
      createdAt: Date.now(),
    });
    return { ok: true as const, id, patched: false };
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(500, Math.max(1, args.limit ?? 100));
    const rows = await ctx.db
      .query("analyses")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    return rows.map((row) => ({
      id: row._id,
      anonymousId: row.anonymousId,
      overallScore: row.overallScore,
      durationSec: row.durationSec,
      level: row.level,
      mainFocus: row.mainFocus,
      source: row.source,
      firstName: row.firstName || "",
      email: row.email || "",
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  },
});

/** Dashboard stats: totals + last 14 days attempts / unique users / avg score */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("analyses")
      .withIndex("by_createdAt")
      .order("desc")
      .take(2000);

    const scored = rows.filter((r) => r.overallScore > 0);
    const incompleteLeads = rows.filter(
      (r) => r.email && r.overallScore <= 0,
    ).length;
    const totalAttempts = scored.length;
    const uniqueUsers = new Set(scored.map((r) => r.anonymousId)).size;
    const avgScore =
      totalAttempts === 0
        ? 0
        : Math.round(
            scored.reduce((s, r) => s + r.overallScore, 0) / totalAttempts,
          );

    const leadsWithEmail = rows.filter((r) => r.email).length;

    const byUser = new Map<
      string,
      { attempts: number; lastScore: number; lastAt: number }
    >();
    for (const r of scored) {
      const cur = byUser.get(r.anonymousId);
      if (!cur) {
        byUser.set(r.anonymousId, {
          attempts: 1,
          lastScore: r.overallScore,
          lastAt: r.createdAt,
        });
      } else {
        cur.attempts += 1;
        if (r.createdAt > cur.lastAt) {
          cur.lastScore = r.overallScore;
          cur.lastAt = r.createdAt;
        }
      }
    }

    const topUsers = [...byUser.entries()]
      .map(([anonymousId, u]) => ({
        anonymousId,
        attempts: u.attempts,
        lastScore: u.lastScore,
        lastAt: new Date(u.lastAt).toISOString(),
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 20);

    const dayMs = 24 * 60 * 60 * 1000;
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const days: {
      date: string;
      attempts: number;
      uniqueUsers: number;
      avgScore: number;
    }[] = [];

    for (let i = 13; i >= 0; i--) {
      const start = todayUtc.getTime() - i * dayMs;
      const end = start + dayMs;
      const dayRows = scored.filter(
        (r) => r.createdAt >= start && r.createdAt < end,
      );
      const uniq = new Set(dayRows.map((r) => r.anonymousId)).size;
      const avg =
        dayRows.length === 0
          ? 0
          : Math.round(
              dayRows.reduce((s, r) => s + r.overallScore, 0) / dayRows.length,
            );
      days.push({
        date: new Date(start).toISOString().slice(0, 10),
        attempts: dayRows.length,
        uniqueUsers: uniq,
        avgScore: avg,
      });
    }

    return {
      totalAttempts,
      uniqueUsers,
      avgScore,
      leadsWithEmail,
      incompleteLeads,
      days,
      topUsers,
    };
  },
});
