import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  FINAL_SESSION,
  INTRO_SESSION,
  PROGRAM_SEED_TASKS,
  REMOVED_SEED_TITLES,
  UNUSED_FINAL_SEEDS,
  attentionSessionNumber,
  isValidSessionNumber,
  stageLabel,
} from "./coachingProgram";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const NAME_MAX = 80;
const EMAIL_MAX = 200;
const FOCUS_MAX = 120;
const MEETING_LINK_MAX = 500;
const TITLE_MAX = 160;
const INSTRUCTIONS_MAX = 8000;
const RESPONSE_TEXT_MAX = 4000;
const DRIVE_URL_MAX = 500;
const PROGRAM_DAYS = 90;

const CLIENT_STATUSES = ["active", "paused", "completed"] as const;
type ClientStatus = (typeof CLIENT_STATUSES)[number];

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, EMAIL_MAX);
}

function normalizeFocus(value: string | undefined): string | undefined {
  const focus = value?.replace(/\s+/g, " ").trim().slice(0, FOCUS_MAX);
  return focus || undefined;
}

function isClientStatus(value: string): value is ClientStatus {
  return (CLIENT_STATUSES as readonly string[]).includes(value);
}

function normalizeVideoShareUrl(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, DRIVE_URL_MAX);
  if (!trimmed) throw new Error("Paste a Google Drive or YouTube link.");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Paste a full Google Drive or YouTube link, starting with https://");
  }
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (parsed.protocol !== "https:") {
    throw new Error("Use an https link.");
  }
  if (host === "drive.google.com") return parsed.toString();
  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    return parsed.toString();
  }
  throw new Error("Use a Google Drive or YouTube link.");
}

function currentProgramDay(startDate: number, now: number): number {
  const day = Math.floor((now - startDate) / 86_400_000) + 1;
  return Math.max(1, day);
}

function normalizeMeetingLink(value: string | undefined): string | undefined {
  const raw = value?.trim().slice(0, MEETING_LINK_MAX);
  if (!raw) return undefined;
  const link = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return link.slice(0, MEETING_LINK_MAX);
}

function parseStartDate(value: string | undefined, now: number): number {
  const raw = value?.trim() ?? "";
  if (!raw) return now;
  const parsed = Date.parse(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) throw new Error("startDate is invalid");
  return parsed;
}

async function seedProgramTasks(
  ctx: MutationCtx,
  clientId: Id<"clients">,
  now: number,
) {
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", clientId))
    .take(200);
  for (const task of existing) {
    const title = task.title.trim().toLowerCase();
    const session = task.sessionNumber ?? INTRO_SESSION;
    const dropSpeechmap =
      REMOVED_SEED_TITLES.includes(title) && session === INTRO_SESSION;
    const dropUnusedFinal =
      session === FINAL_SESSION &&
      UNUSED_FINAL_SEEDS.includes(title) &&
      task.status === "open";
    if (dropSpeechmap || dropUnusedFinal) {
      if (task.storageId) await ctx.storage.delete(task.storageId);
      await ctx.db.delete(task._id);
    }
  }
  const remaining = existing.filter((task) => {
    const title = task.title.trim().toLowerCase();
    const session = task.sessionNumber ?? INTRO_SESSION;
    if (REMOVED_SEED_TITLES.includes(title) && session === INTRO_SESSION) {
      return false;
    }
    if (
      session === FINAL_SESSION &&
      UNUSED_FINAL_SEEDS.includes(title) &&
      task.status === "open"
    ) {
      return false;
    }
    return true;
  });
  for (const seed of PROGRAM_SEED_TASKS) {
    const already = remaining.find(
      (task) =>
        (task.sessionNumber ?? INTRO_SESSION) === seed.sessionNumber &&
        task.title.trim().toLowerCase() === seed.title.toLowerCase(),
    );
    if (already) {
      if (already.status === "open") {
        const patch: {
          reviewRequired?: boolean;
          instructions?: string;
          updatedAt: number;
        } = { updatedAt: now };
        let changed = false;
        if (already.reviewRequired !== seed.reviewRequired) {
          patch.reviewRequired = seed.reviewRequired;
          changed = true;
        }
        if (already.instructions !== seed.instructions) {
          patch.instructions = seed.instructions;
          changed = true;
        }
        if (changed) await ctx.db.patch(already._id, patch);
      }
      continue;
    }
    await ctx.db.insert("tasks", {
      clientId,
      sessionNumber: seed.sessionNumber,
      title: seed.title,
      instructions: seed.instructions,
      recordingRequired: seed.recordingRequired,
      reviewRequired: seed.reviewRequired,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function toClientView(
  ctx: QueryCtx,
  row: Doc<"clients">,
  now: number,
  detail = false,
) {
  const user = await ctx.db.get(row.userId);
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", row._id))
    .take(200);
  const bySession = (a: Doc<"tasks">, b: Doc<"tasks">) =>
    (a.sessionNumber ?? INTRO_SESSION) - (b.sessionNumber ?? INTRO_SESSION);
  const pendingReviews = tasks
    .filter(
      (task) => task.status === "submitted" && task.reviewRequired !== false,
    )
    .sort(bySession);
  const currentStage = stageLabel(attentionSessionNumber(tasks));

  return {
    id: row._id,
    userId: row.userId,
    name: user?.name ?? "Unknown",
    email: user?.email ?? "",
    startDate: new Date(row.startDate).toISOString(),
    currentDay: currentProgramDay(row.startDate, now),
    programDays: PROGRAM_DAYS,
    currentFocus: row.currentFocus ?? "",
    meetingLink: row.meetingLink ?? "",
    status: row.status,
    currentStage,
    reviewRequired: pendingReviews.length > 0,
    pendingReviews: pendingReviews.length,
    lastActivityAt: new Date(row.lastActivityAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
    onboardingComplete: row.onboardingComplete === true,
    onboardingRole: row.onboardingRole ?? "",
    onboardingCompany: row.onboardingCompany ?? "",
    onboardingGoal: row.onboardingGoal ?? "",
    linkedinProfileJson: row.linkedinProfileJson ?? "",
    linkedinText: detail ? (row.linkedinText ?? "") : "",
  };
}

/** Admin list: coaching clients only. Pending reviews stay 0 until review slice. */
export const listClients = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("clients")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200);

    return Promise.all(rows.map((row) => toClientView(ctx, row, now)));
  },
});

/** Temporary client login: email must already exist in admin. */
export const getClientByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email || !email.includes("@")) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user || user.role !== "client") return null;

    const row = await ctx.db
      .query("clients")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!row) return null;

    return toClientView(ctx, row, Date.now());
  },
});

export const getClient = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    return toClientView(ctx, row, Date.now(), true);
  },
});

export const createClient = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    startDate: v.optional(v.string()),
    currentFocus: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name);
    const email = normalizeEmail(args.email);
    if (!name) throw new Error("name required");
    if (!email || !email.includes("@")) throw new Error("valid email required");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existingUser) throw new Error("A user with this email already exists");

    const now = Date.now();
    const startDate = parseStartDate(args.startDate, now);
    const currentFocus = normalizeFocus(args.currentFocus);
    const meetingLink = normalizeMeetingLink(args.meetingLink);

    const userId = await ctx.db.insert("users", {
      name,
      email,
      role: "client",
      createdAt: now,
      updatedAt: now,
    });

    const clientId = await ctx.db.insert("clients", {
      userId,
      startDate,
      ...(currentFocus ? { currentFocus } : {}),
      ...(meetingLink ? { meetingLink } : {}),
      status: "active",
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await seedProgramTasks(ctx, clientId, now);

    return { ok: true as const, id: clientId, userId };
  },
});

export const updateClient = mutation({
  args: {
    id: v.id("clients"),
    currentFocus: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };

    const now = Date.now();
    const patch: {
      currentFocus?: string;
      meetingLink?: string;
      status?: ClientStatus;
      startDate?: number;
      updatedAt: number;
    } = { updatedAt: now };

    if (args.currentFocus !== undefined) {
      patch.currentFocus = normalizeFocus(args.currentFocus);
    }
    if (args.status !== undefined) {
      if (!isClientStatus(args.status)) throw new Error("invalid status");
      patch.status = args.status;
    }
    if (args.startDate !== undefined) {
      patch.startDate = parseStartDate(args.startDate, existing.startDate);
    }
    if (args.meetingLink !== undefined) {
      patch.meetingLink = normalizeMeetingLink(args.meetingLink);
    }

    await ctx.db.patch(args.id, patch);
    return { ok: true as const };
  },
});

export const removeClient = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };

    const user = await ctx.db.get(existing.userId);
    const intro = await ctx.db
      .query("introCallReports")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.id))
      .unique();
    if (intro) await ctx.db.delete(intro._id);
    const sessionRows = await ctx.db
      .query("coachingSessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.id))
      .collect();
    for (const row of sessionRows) {
      await ctx.db.delete(row._id);
    }
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", args.id))
      .collect();
    for (const task of tasks) {
      if (task.storageId) await ctx.storage.delete(task.storageId);
      await ctx.db.delete(task._id);
    }
    await ctx.db.delete(args.id);
    if (user?.role === "client") {
      await ctx.db.delete(existing.userId);
    }
    return { ok: true as const };
  },
});

async function toTaskView(ctx: QueryCtx, row: Doc<"tasks">) {
  const recordingUrl = row.storageId
    ? ((await ctx.storage.getUrl(row.storageId)) ?? "")
    : "";
  return {
    id: row._id,
    clientId: row.clientId,
    sessionNumber: row.sessionNumber ?? 1,
    title: row.title,
    instructions: row.instructions,
    recordingRequired: row.recordingRequired,
    reviewRequired: row.reviewRequired !== false,
    status: row.status,
    recordingUrl,
    driveUrl: row.driveUrl ?? "",
    durationSec: row.durationSec ?? null,
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : "",
    rating: row.rating ?? null,
    ratingComment: row.ratingComment ?? "",
    responseText: row.responseText ?? "",
    clientRevisionUsed: row.clientRevisionUsed === true,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : "",
  };
}

export const listTasksForClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("tasks")
      .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(200);
    return Promise.all(rows.map((row) => toTaskView(ctx, row)));
  },
});

export const getTask = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    const client = await ctx.db.get(row.clientId);
    const user = client ? await ctx.db.get(client.userId) : null;
    const view = await toTaskView(ctx, row);
    return {
      ...view,
      clientName: user?.name ?? "Client",
    };
  },
});

export const ensureProgramTasks = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");
    await seedProgramTasks(ctx, args.clientId, Date.now());
    return { ok: true as const };
  },
});

export const createTask = mutation({
  args: {
    clientId: v.id("clients"),
    sessionNumber: v.optional(v.number()),
    title: v.string(),
    instructions: v.string(),
    recordingRequired: v.optional(v.boolean()),
    reviewRequired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("client not found");

    const title = args.title.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
    const instructions = args.instructions.trim().slice(0, INSTRUCTIONS_MAX);
    if (!title) throw new Error("title required");
    if (!instructions) throw new Error("instructions required");
    const sessionNumber = Math.round(args.sessionNumber ?? 1);
    if (!isValidSessionNumber(sessionNumber)) {
      throw new Error("sessionNumber must be Intro Call, 1–9, or Final Call");
    }

    const now = Date.now();
    const id = await ctx.db.insert("tasks", {
      clientId: args.clientId,
      sessionNumber,
      title,
      instructions,
      recordingRequired: args.recordingRequired === true,
      reviewRequired: args.reviewRequired !== false,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(args.clientId, {
      lastActivityAt: now,
      updatedAt: now,
    });
    return { ok: true as const, id };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => ctx.storage.getUrl(args.storageId),
});

const ROLE_MAX = 120;
const COMPANY_MAX = 120;
const GOAL_MAX = 800;
const PROFILE_JSON_MAX = 60_000;
const LINKEDIN_TEXT_MAX = 80_000;

export const saveOnboarding = mutation({
  args: {
    clientId: v.id("clients"),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    goal: v.optional(v.string()),
    linkedinStorageId: v.id("_storage"),
    linkedinText: v.string(),
    linkedinProfileJson: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.clientId);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    if (existing.onboardingComplete === true) {
      return { ok: false as const, reason: "already_complete" as const };
    }

    const role = (args.role ?? "").replace(/\s+/g, " ").trim().slice(0, ROLE_MAX);
    const company = (args.company ?? "").replace(/\s+/g, " ").trim().slice(0, COMPANY_MAX);
    const goal = (args.goal ?? "").replace(/\s+/g, " ").trim().slice(0, GOAL_MAX);

    const now = Date.now();
    if (existing.linkedinStorageId && existing.linkedinStorageId !== args.linkedinStorageId) {
      await ctx.storage.delete(existing.linkedinStorageId);
    }

    await ctx.db.patch(args.clientId, {
      onboardingComplete: true,
      ...(role ? { onboardingRole: role } : {}),
      ...(company ? { onboardingCompany: company } : {}),
      ...(goal ? { onboardingGoal: goal } : {}),
      linkedinStorageId: args.linkedinStorageId,
      linkedinText: args.linkedinText.slice(0, LINKEDIN_TEXT_MAX),
      linkedinProfileJson: args.linkedinProfileJson.slice(0, PROFILE_JSON_MAX),
      lastActivityAt: now,
      updatedAt: now,
    });

    return { ok: true as const };
  },
});

export const submitTask = mutation({
  args: {
    id: v.id("tasks"),
    storageId: v.optional(v.id("_storage")),
    driveUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    responseText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    if (existing.status !== "open") {
      throw new Error("This task is already submitted and cannot be changed.");
    }
    const wantsLink =
      existing.recordingRequired &&
      (existing.sessionNumber ?? 1) === INTRO_SESSION;
    const driveUrl = args.driveUrl
      ? normalizeVideoShareUrl(args.driveUrl)
      : "";
    if (wantsLink && !driveUrl) {
      throw new Error("Paste a Google Drive or YouTube link.");
    }
    if (existing.recordingRequired && !wantsLink && !args.storageId) {
      throw new Error("Record audio first.");
    }
    const now = Date.now();
    const needsReview = existing.reviewRequired !== false;
    const responseText = args.responseText?.trim().slice(0, RESPONSE_TEXT_MAX);
    await ctx.db.patch(args.id, {
      status: needsReview ? "submitted" : "done",
      ...(args.storageId ? { storageId: args.storageId } : {}),
      ...(driveUrl ? { driveUrl } : {}),
      durationSec:
        typeof args.durationSec === "number" && Number.isFinite(args.durationSec)
          ? Math.max(0, Math.round(args.durationSec))
          : undefined,
      submittedAt: now,
      updatedAt: now,
      ...(responseText ? { responseText } : {}),
      ...(needsReview ? {} : { completedAt: now }),
    });
    await ctx.db.patch(existing.clientId, {
      lastActivityAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const reviseTask = mutation({
  args: {
    id: v.id("tasks"),
    storageId: v.optional(v.id("_storage")),
    driveUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    responseText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    if (existing.status !== "submitted") {
      throw new Error("Only a submitted task can be changed once.");
    }
    if (existing.clientRevisionUsed) {
      throw new Error("You already used your one change.");
    }
    const responseText = args.responseText?.trim().slice(0, RESPONSE_TEXT_MAX);
    const driveUrl = args.driveUrl
      ? normalizeVideoShareUrl(args.driveUrl)
      : "";
    if (!args.storageId && !driveUrl && responseText == null) {
      throw new Error("Record a new clip or paste a new link.");
    }

    const now = Date.now();
    const patch: {
      storageId?: Id<"_storage">;
      driveUrl?: string;
      durationSec?: number;
      responseText?: string;
      clientRevisionUsed: boolean;
      updatedAt: number;
    } = {
      clientRevisionUsed: true,
      updatedAt: now,
    };
    if (args.storageId) {
      if (existing.storageId) await ctx.storage.delete(existing.storageId);
      patch.storageId = args.storageId;
      if (typeof args.durationSec === "number" && Number.isFinite(args.durationSec)) {
        patch.durationSec = Math.max(0, Math.round(args.durationSec));
      }
    }
    if (driveUrl) patch.driveUrl = driveUrl;
    if (responseText != null) patch.responseText = responseText;

    await ctx.db.patch(args.id, patch);
    await ctx.db.patch(existing.clientId, {
      lastActivityAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const rateTask = mutation({
  args: {
    id: v.id("tasks"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    if (existing.status === "open") {
      throw new Error("Client has not submitted this task yet.");
    }

    const rating = Math.round(args.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
      throw new Error("rating must be 0–10");
    }
    const ratingComment = args.comment?.replace(/\s+/g, " ").trim().slice(0, 2000);

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "reviewed",
      rating,
      ...(ratingComment ? { ratingComment } : { ratingComment: undefined }),
      updatedAt: now,
    });
    await ctx.db.patch(existing.clientId, {
      lastActivityAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    instructions: v.optional(v.string()),
    recordingRequired: v.optional(v.boolean()),
    reviewRequired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };

    const patch: {
      title?: string;
      instructions?: string;
      recordingRequired?: boolean;
      reviewRequired?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (typeof args.title === "string") {
      const title = args.title.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
      if (!title) throw new Error("title required");
      patch.title = title;
    }
    if (typeof args.instructions === "string") {
      const instructions = args.instructions.trim().slice(0, INSTRUCTIONS_MAX);
      if (!instructions) throw new Error("instructions required");
      patch.instructions = instructions;
    }
    if (typeof args.recordingRequired === "boolean") {
      patch.recordingRequired = args.recordingRequired;
    }
    if (typeof args.reviewRequired === "boolean") {
      patch.reviewRequired = args.reviewRequired;
    }

    await ctx.db.patch(args.id, patch);
    await ctx.db.patch(existing.clientId, {
      lastActivityAt: patch.updatedAt,
      updatedAt: patch.updatedAt,
    });
    return { ok: true as const };
  },
});

export const completeTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    if (existing.recordingRequired && existing.status === "open") {
      throw new Error("Client must paste a Google Drive link first.");
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "done",
      updatedAt: now,
      completedAt: now,
    });
    await ctx.db.patch(existing.clientId, {
      lastActivityAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const removeTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };
    if (existing.status !== "open") {
      throw new Error("Submitted tasks cannot be deleted.");
    }
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});
