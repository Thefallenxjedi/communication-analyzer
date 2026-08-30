import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { estimateAnalysisDurationMs } from "./estimateAnalysisDuration";

function displayAnalysisDurationMs(row: {
  analysisDurationMs?: number;
  analysisDurationEstimated?: boolean;
  durationSec?: number | null;
  captureMethod?: string;
  source?: string;
  status?: string;
  overallScore?: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}): { ms: number | null; estimated: boolean } {
  // Incomplete leads never ran analysis — do not invent a "~Ns" estimate.
  if (
    row.status !== "failed" &&
    row.status !== "success" &&
    (row.overallScore ?? 0) <= 0
  ) {
    return { ms: null, estimated: false };
  }
  if (
    typeof row.analysisDurationMs === "number" &&
    row.analysisDurationMs > 0
  ) {
    return {
      ms: row.analysisDurationMs,
      estimated: row.analysisDurationEstimated === true,
    };
  }
  const ms = estimateAnalysisDurationMs(row);
  return { ms, estimated: true };
}

/** Lead placeholder: opted in before any diagnosis finished. */
function isIncompleteLead(row: {
  status?: string;
  overallScore: number;
}): boolean {
  return row.status !== "failed" && row.status !== "success" && row.overallScore <= 0;
}

export const insert = mutation({
  args: {
    anonymousId: v.string(),
    overallScore: v.number(),
    durationSec: v.union(v.number(), v.null()),
    level: v.string(),
    mainFocus: v.string(),
    source: v.optional(v.string()),
    captureMethod: v.optional(v.string()),
    firstName: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.union(v.literal("success"), v.literal("failed"))),
    failureReason: v.optional(v.string()),
    reportSlug: v.optional(v.string()),
    costUsd: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    analysisDurationMs: v.optional(v.number()),
    promptAddOnIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const anonymousId = args.anonymousId.trim().slice(0, 128);
    if (!anonymousId) throw new Error("anonymousId required");

    const status = args.status ?? "success";
    const firstName = args.firstName?.trim().slice(0, 80);
    const email = args.email?.trim().toLowerCase().slice(0, 200);
    const reportSlug = args.reportSlug?.trim().toLowerCase().slice(0, 32);
    const now = Date.now();

    const fields = {
      overallScore: Math.round(args.overallScore),
      durationSec:
        args.durationSec != null && Number.isFinite(args.durationSec)
          ? Math.round(args.durationSec)
          : null,
      level: args.level.slice(0, 120),
      mainFocus: args.mainFocus.slice(0, 200),
      source: args.source?.slice(0, 64),
      ...(args.captureMethod
        ? { captureMethod: args.captureMethod.slice(0, 32) }
        : {}),
      ...(firstName ? { firstName } : {}),
      ...(email ? { email } : {}),
      status,
      ...(status === "failed" && args.failureReason
        ? { failureReason: args.failureReason.slice(0, 240) }
        : {}),
      ...(reportSlug ? { reportSlug } : {}),
      ...(typeof args.costUsd === "number" && Number.isFinite(args.costUsd)
        ? { costUsd: Math.max(0, args.costUsd) }
        : {}),
      ...(typeof args.inputTokens === "number" && Number.isFinite(args.inputTokens)
        ? { inputTokens: Math.max(0, Math.round(args.inputTokens)) }
        : {}),
      ...(typeof args.outputTokens === "number" &&
      Number.isFinite(args.outputTokens)
        ? { outputTokens: Math.max(0, Math.round(args.outputTokens)) }
        : {}),
      ...(typeof args.analysisDurationMs === "number" &&
      Number.isFinite(args.analysisDurationMs)
        ? {
            analysisDurationMs: Math.max(
              0,
              Math.round(args.analysisDurationMs),
            ),
          }
        : {}),
      ...(Array.isArray(args.promptAddOnIds) && args.promptAddOnIds.length
        ? {
            promptAddOnIds: args.promptAddOnIds
              .map((id) => String(id).trim().slice(0, 64))
              .filter(Boolean)
              .slice(0, 50),
          }
        : {}),
      createdAt: now,
    };

    // Upgrade latest incomplete lead for this browser into this attempt
    // instead of leaving a duplicate Incomplete + Completed pair.
    const latest = await ctx.db
      .query("analyses")
      .withIndex("by_anonymousId_createdAt", (q) =>
        q.eq("anonymousId", anonymousId),
      )
      .order("desc")
      .first();

    if (latest && isIncompleteLead(latest)) {
      await ctx.db.patch(latest._id, {
        ...fields,
        // Keep lead name/email if this attempt did not send them again.
        firstName: firstName || latest.firstName,
        email: email || latest.email,
      });
      return latest._id;
    }

    const id = await ctx.db.insert("analyses", {
      anonymousId,
      ...fields,
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

/** Admin: delete a single analysis / lead row. */
export const remove = mutation({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return { ok: false as const, reason: "not_found" };
    }
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});

/** Admin: delete many analysis / lead rows in one call. */
export const removeMany = mutation({
  args: { ids: v.array(v.id("analyses")) },
  handler: async (ctx, args) => {
    const unique = [...new Set(args.ids)].slice(0, 500);
    let deleted = 0;
    let missing = 0;
    for (const id of unique) {
      const existing = await ctx.db.get(id);
      if (!existing) {
        missing += 1;
        continue;
      }
      await ctx.db.delete(id);
      deleted += 1;
    }
    return { ok: true as const, deleted, missing };
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

    return rows.map((row) => {
      const timing = displayAnalysisDurationMs(row);
      return {
      id: row._id,
      anonymousId: row.anonymousId,
      overallScore: row.overallScore,
      durationSec: row.durationSec,
      level: row.level,
      mainFocus: row.mainFocus,
      source: row.source,
      captureMethod: row.captureMethod || "",
      firstName: row.firstName || "",
      email: row.email || "",
      status: row.status,
      failureReason: row.failureReason || "",
      reportSlug: row.reportSlug || "",
      costUsd: row.costUsd ?? null,
      inputTokens: row.inputTokens ?? null,
      outputTokens: row.outputTokens ?? null,
      analysisDurationMs: timing.ms,
      analysisDurationEstimated: timing.estimated,
      createdAt: new Date(row.createdAt).toISOString(),
    };
    });
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

    const scored = rows.filter(
      (r) => r.status !== "failed" && r.overallScore > 0,
    );
    const failedAttempts = rows.filter((r) => r.status === "failed").length;
    const incompleteLeads = rows.filter(
      (r) =>
        r.status !== "failed" && r.email && r.overallScore <= 0,
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
    const totalCostUsd = rows.reduce(
      (sum, r) => sum + (typeof r.costUsd === "number" ? r.costUsd : 0),
      0,
    );

    const recent20 = rows.slice(0, 20);
    const recent20TimingMs = recent20
      .map((r) => displayAnalysisDurationMs(r).ms)
      .filter((ms): ms is number => typeof ms === "number" && ms > 0);
    const avgAnalysisDurationMs =
      recent20TimingMs.length > 0
        ? Math.round(
            recent20TimingMs.reduce((sum, ms) => sum + ms, 0) /
              recent20TimingMs.length,
          )
        : null;

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

    const focusCounts = new Map<string, number>();
    for (const r of scored) {
      const focus = (r.mainFocus || "").trim() || "Unknown";
      focusCounts.set(focus, (focusCounts.get(focus) || 0) + 1);
    }
    const mainFocusBreakdown = [...focusCounts.entries()]
      .map(([focus, count]) => ({
        focus,
        count,
        percent:
          totalAttempts === 0
            ? 0
            : Math.round((count / totalAttempts) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const levelCounts = new Map<string, number>();
    for (const r of scored) {
      const level = (r.level || "").trim() || "Unknown";
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }
    const levelBreakdown = [...levelCounts.entries()]
      .map(([level, count]) => ({
        level,
        count,
        percent:
          totalAttempts === 0
            ? 0
            : Math.round((count / totalAttempts) * 100),
      }))
      .sort((a, b) => b.count - a.count);

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
      failedAttempts,
      incompleteLeads,
      leadsWithEmail,
      totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
      avgAnalysisDurationMs,
      avgAnalysisDurationSampleCount: recent20TimingMs.length,
      days,
      topUsers,
      mainFocusBreakdown,
      levelBreakdown,
    };
  },
});

/** Top X% for a score vs recent completed assessments. Null if not enough data. */
export const scoreTopPercent = query({
  args: { score: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("analyses")
      .withIndex("by_createdAt")
      .order("desc")
      .take(2000);

    const scored = rows
      .filter((r) => r.status !== "failed")
      .map((r) => r.overallScore)
      .filter((s) => Number.isFinite(s) && s > 0);

    const MIN_SAMPLES = 20;
    if (scored.length < MIN_SAMPLES) {
      return null;
    }

    const score = Math.round(args.score);
    const higher = scored.filter((s) => s > score).length;
    // Share of assessments that scored higher → "Top X%"
    const top = Math.round((higher / scored.length) * 100);
    return Math.max(1, Math.min(99, top === 0 ? 1 : top));
  },
});

/** Persist estimated generation times for recent rows missing wall-clock data. */
export const backfillAnalysisDuration = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(100, Math.max(1, args.limit ?? 20));
    const rows = await ctx.db
      .query("analyses")
      .withIndex("by_createdAt")
      .order("desc")
      .take(Math.max(limit * 3, 60));

    let patched = 0;
    for (const row of rows) {
      if (patched >= limit) break;
      if (
        typeof row.analysisDurationMs === "number" &&
        row.analysisDurationMs > 0
      ) {
        continue;
      }
      const ms = estimateAnalysisDurationMs(row);
      await ctx.db.patch(row._id, {
        analysisDurationMs: ms,
        analysisDurationEstimated: true,
      });
      patched += 1;
    }

    return { ok: true as const, patched };
  },
});
