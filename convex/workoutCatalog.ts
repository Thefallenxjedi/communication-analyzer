import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStaffRole } from "./adminAccess";

const SLUG_MAX = 80;
const NAME_MAX = 160;
const TEXT_MAX = 20_000;
const TAG_MAX = 40;
const TAGS_MAX = 24;

function cleanSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX);
}

function cleanTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase().slice(0, TAG_MAX);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}

function mapRow(row: {
  _id: string;
  slug: string;
  name: string;
  purpose: string;
  problemItSolves: string;
  instructions: string;
  whenToUse: string;
  tags: string[];
  timing: string;
  timingMinutes?: number;
  problemNumber?: number;
  problemTitle?: string;
  exerciseIndex?: number;
  timelineSummary?: string;
  source?: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}) {
  return {
    id: row._id,
    slug: row.slug,
    name: row.name,
    purpose: row.purpose,
    problemItSolves: row.problemItSolves,
    instructions: row.instructions,
    whenToUse: row.whenToUse,
    tags: row.tags,
    timing: row.timing,
    timingMinutes: row.timingMinutes ?? null,
    problemNumber: row.problemNumber ?? null,
    problemTitle: row.problemTitle ?? null,
    exerciseIndex: row.exerciseIndex ?? null,
    timelineSummary: row.timelineSummary ?? null,
    source: row.source ?? null,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export const list = query({
  args: {
    enabledOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const enabledOnly = args.enabledOnly === true;
    const rows = enabledOnly
      ? await ctx.db
          .query("workoutExercises")
          .withIndex("by_enabled_sortOrder", (q) => q.eq("enabled", true))
          .order("asc")
          .take(200)
      : await ctx.db
          .query("workoutExercises")
          .withIndex("by_sortOrder")
          .order("asc")
          .take(200);

    return rows.map(mapRow);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = cleanSlug(args.slug);
    if (!slug) return null;
    const row = await ctx.db
      .query("workoutExercises")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return row ? mapRow(row) : null;
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("workoutExercises")),
    slug: v.string(),
    name: v.string(),
    purpose: v.string(),
    problemItSolves: v.optional(v.string()),
    instructions: v.string(),
    whenToUse: v.string(),
    tags: v.array(v.string()),
    timing: v.string(),
    timingMinutes: v.optional(v.number()),
    problemNumber: v.optional(v.number()),
    problemTitle: v.optional(v.string()),
    exerciseIndex: v.optional(v.number()),
    timelineSummary: v.optional(v.string()),
    source: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const slug = cleanSlug(args.slug);
    const name = args.name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
    const purpose = args.purpose.trim().slice(0, TEXT_MAX);
    const problemItSolves = (args.problemItSolves ?? "").trim().slice(0, TEXT_MAX);
    const instructions = args.instructions.trim().slice(0, TEXT_MAX);
    const whenToUse = args.whenToUse.trim().slice(0, TEXT_MAX);
    const timing = args.timing.replace(/\s+/g, " ").trim().slice(0, 80);
    const tags = cleanTags(args.tags);

    if (!slug) throw new Error("slug required");
    if (!name) throw new Error("name required");
    if (!purpose) throw new Error("purpose required");
    if (!instructions) throw new Error("instructions required");
    if (!whenToUse) throw new Error("whenToUse required");
    if (!timing) throw new Error("timing required");

    const now = Date.now();
    const sortOrder =
      typeof args.sortOrder === "number" && Number.isFinite(args.sortOrder)
        ? args.sortOrder
        : typeof args.problemNumber === "number" &&
            typeof args.exerciseIndex === "number"
          ? args.problemNumber * 10 + args.exerciseIndex
          : now;

    const payload = {
      slug,
      name,
      purpose,
      problemItSolves,
      instructions,
      whenToUse,
      tags,
      timing,
      timingMinutes:
        typeof args.timingMinutes === "number" && args.timingMinutes > 0
          ? Math.round(args.timingMinutes)
          : undefined,
      problemNumber:
        typeof args.problemNumber === "number"
          ? Math.round(args.problemNumber)
          : undefined,
      problemTitle: args.problemTitle?.trim().slice(0, NAME_MAX) || undefined,
      exerciseIndex:
        typeof args.exerciseIndex === "number"
          ? Math.round(args.exerciseIndex)
          : undefined,
      timelineSummary: args.timelineSummary?.trim().slice(0, 2000) || undefined,
      source: args.source?.trim().slice(0, 80) || undefined,
      enabled: args.enabled !== false,
      sortOrder,
      updatedAt: now,
    };

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) return { ok: false as const, reason: "not_found" as const };
      const clash = await ctx.db
        .query("workoutExercises")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (clash && clash._id !== args.id) {
        throw new Error(`slug already in use: ${slug}`);
      }
      await ctx.db.patch(args.id, payload);
      return { ok: true as const, id: args.id, slug };
    }

    const bySlug = await ctx.db
      .query("workoutExercises")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (bySlug) {
      await ctx.db.patch(bySlug._id, payload);
      return { ok: true as const, id: bySlug._id, slug };
    }

    const id = await ctx.db.insert("workoutExercises", {
      ...payload,
      createdAt: now,
    });
    return { ok: true as const, id, slug };
  },
});

export const setEnabled = mutation({
  args: {
    id: v.id("workoutExercises"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
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
  args: { id: v.id("workoutExercises") },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});

/** Delete many catalog rows (bulk admin cleanup). */
export const removeMany = mutation({
  args: {
    ids: v.optional(v.array(v.id("workoutExercises"))),
    /** When true, delete every catalog exercise. */
    all: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    let deleted = 0;
    if (args.all === true) {
      const rows = await ctx.db.query("workoutExercises").take(500);
      for (const row of rows) {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
      // Keep deleting if more than 500
      let more = await ctx.db.query("workoutExercises").take(500);
      while (more.length > 0) {
        for (const row of more) {
          await ctx.db.delete(row._id);
          deleted += 1;
        }
        more = await ctx.db.query("workoutExercises").take(500);
      }
      return { ok: true as const, deleted };
    }

    const ids = args.ids ?? [];
    for (const id of ids) {
      const existing = await ctx.db.get(id);
      if (!existing) continue;
      await ctx.db.delete(id);
      deleted += 1;
    }
    return { ok: true as const, deleted };
  },
});

const seedExerciseValidator = v.object({
  slug: v.string(),
  name: v.string(),
  purpose: v.string(),
  problemItSolves: v.string(),
  instructions: v.string(),
  whenToUse: v.string(),
  tags: v.array(v.string()),
  timing: v.string(),
  timingMinutes: v.optional(v.number()),
  problemNumber: v.optional(v.number()),
  problemTitle: v.optional(v.string()),
  exerciseIndex: v.optional(v.number()),
  timelineSummary: v.optional(v.string()),
  source: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  enabled: v.optional(v.boolean()),
});

/** Upsert a batch of catalog exercises (Problem Bible seed or coach imports). */
export const seedBatch = mutation({
  args: {
    exercises: v.array(seedExerciseValidator),
    /** When true, leave coach edits on matching slugs and only insert missing. */
    insertOnlyMissing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaffRole(ctx, "editor");
    const insertOnlyMissing = args.insertOnlyMissing === true;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const now = Date.now();

    for (const ex of args.exercises) {
      const slug = cleanSlug(ex.slug);
      if (!slug) continue;

      const existing = await ctx.db
        .query("workoutExercises")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (existing && insertOnlyMissing) {
        skipped += 1;
        continue;
      }

      const sortOrder =
        typeof ex.sortOrder === "number"
          ? ex.sortOrder
          : typeof ex.problemNumber === "number" &&
              typeof ex.exerciseIndex === "number"
            ? ex.problemNumber * 10 + ex.exerciseIndex
            : now;

      const payload = {
        slug,
        name: ex.name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX),
        purpose: ex.purpose.trim().slice(0, TEXT_MAX),
        problemItSolves: ex.problemItSolves.trim().slice(0, TEXT_MAX),
        instructions: ex.instructions.trim().slice(0, TEXT_MAX),
        whenToUse: ex.whenToUse.trim().slice(0, TEXT_MAX),
        tags: cleanTags(ex.tags),
        timing: ex.timing.replace(/\s+/g, " ").trim().slice(0, 80),
        timingMinutes:
          typeof ex.timingMinutes === "number" && ex.timingMinutes > 0
            ? Math.round(ex.timingMinutes)
            : undefined,
        problemNumber:
          typeof ex.problemNumber === "number"
            ? Math.round(ex.problemNumber)
            : undefined,
        problemTitle: ex.problemTitle?.trim().slice(0, NAME_MAX) || undefined,
        exerciseIndex:
          typeof ex.exerciseIndex === "number"
            ? Math.round(ex.exerciseIndex)
            : undefined,
        timelineSummary: ex.timelineSummary?.trim().slice(0, 2000) || undefined,
        source: ex.source?.trim().slice(0, 80) || "problem-bible",
        enabled: ex.enabled !== false,
        sortOrder,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated += 1;
      } else {
        await ctx.db.insert("workoutExercises", {
          ...payload,
          createdAt: now,
        });
        inserted += 1;
      }
    }

    return { ok: true as const, inserted, updated, skipped };
  },
});
