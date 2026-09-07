import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";

const PROMPT_MAX = 500;
const TRANSCRIPT_MAX = 40_000;
const LEVEL_MAX = 120;
const FOCUS_MAX = 200;
const SHARE_SLUG_MAX = 32;
const REPORT_JSON_MAX = 120_000;
const FAILURE_MAX = 500;
const CAPTURE_METHOD_MAX = 32;
const RECORDING_TTL_MS = 6 * 60 * 60 * 1000;

async function getAuthedClientId(ctx: {
  auth: QueryCtx["auth"];
  db: QueryCtx["db"];
}) {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) return null;
  const client = await ctx.db
    .query("clients")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  return client?._id ?? null;
}

async function toView(
  ctx: QueryCtx,
  row: Doc<"clientDiagnoses">,
) {
  const recordingExpired = row.createdAt <= Date.now() - RECORDING_TTL_MS;
  const recordingUrl =
    row.storageId && !recordingExpired
      ? ((await ctx.storage.getUrl(row.storageId)) ?? "")
      : "";
  return {
    id: row._id,
    clientId: row.clientId,
    status: row.status,
    captureMethod: row.captureMethod ?? "",
    recordingUrl,
    durationSec: row.durationSec ?? null,
    promptQuestion: row.promptQuestion ?? "",
    transcript: row.transcript ?? "",
    overallScore: row.overallScore ?? null,
    level: row.level ?? "",
    mainFocus: row.mainFocus ?? "",
    shareSlug: row.shareSlug ?? "",
    reportJson: row.reportJson ?? "",
    failureReason: row.failureReason ?? "",
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const clientId = await getAuthedClientId(ctx);
    if (!clientId) return [];
    const rows = await ctx.db
      .query("clientDiagnoses")
      .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", clientId))
      .order("desc")
      .take(50);
    return Promise.all(rows.map((row) => toView(ctx, row)));
  },
});

export const createMine = mutation({
  args: {
    storageId: v.optional(v.id("_storage")),
    durationSec: v.optional(v.number()),
    promptQuestion: v.optional(v.string()),
    captureMethod: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("failed")),
    transcript: v.optional(v.string()),
    overallScore: v.optional(v.number()),
    level: v.optional(v.string()),
    mainFocus: v.optional(v.string()),
    shareSlug: v.optional(v.string()),
    reportJson: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = await getAuthedClientId(ctx);
    if (!clientId) throw new Error("Not signed in.");

    const now = Date.now();
    const id = await ctx.db.insert("clientDiagnoses", {
      clientId,
      status: args.status,
      ...(args.storageId ? { storageId: args.storageId } : {}),
      ...(typeof args.durationSec === "number" && Number.isFinite(args.durationSec)
        ? { durationSec: Math.max(1, Math.min(1_200, Math.round(args.durationSec))) }
        : {}),
      ...(args.promptQuestion?.trim()
        ? { promptQuestion: args.promptQuestion.trim().slice(0, PROMPT_MAX) }
        : {}),
      ...(args.captureMethod?.trim()
        ? { captureMethod: args.captureMethod.trim().slice(0, CAPTURE_METHOD_MAX) }
        : {}),
      ...(args.transcript?.trim()
        ? { transcript: args.transcript.trim().slice(0, TRANSCRIPT_MAX) }
        : {}),
      ...(typeof args.overallScore === "number" && Number.isFinite(args.overallScore)
        ? { overallScore: Math.max(0, Math.min(100, Math.round(args.overallScore))) }
        : {}),
      ...(args.level?.trim() ? { level: args.level.trim().slice(0, LEVEL_MAX) } : {}),
      ...(args.mainFocus?.trim()
        ? { mainFocus: args.mainFocus.trim().slice(0, FOCUS_MAX) }
        : {}),
      ...(args.shareSlug?.trim()
        ? { shareSlug: args.shareSlug.trim().toLowerCase().slice(0, SHARE_SLUG_MAX) }
        : {}),
      ...(args.reportJson?.trim()
        ? { reportJson: args.reportJson.trim().slice(0, REPORT_JSON_MAX) }
        : {}),
      ...(args.failureReason?.trim()
        ? { failureReason: args.failureReason.trim().slice(0, FAILURE_MAX) }
        : {}),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(clientId, {
      lastActivityAt: now,
      updatedAt: now,
    });

    return { ok: true as const, id };
  },
});

export const purgeExpiredRecordings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RECORDING_TTL_MS;
    const rows = await ctx.db
      .query("clientDiagnoses")
      .withIndex("by_createdAt", (q) => q.lte("createdAt", cutoff))
      .take(200);

    let cleared = 0;
    for (const row of rows) {
      if (!row.storageId) continue;
      await ctx.storage.delete(row.storageId);
      await ctx.db.patch(row._id, {
        storageId: undefined,
        updatedAt: Date.now(),
      });
      cleared += 1;
    }

    return { ok: true as const, cleared };
  },
});
