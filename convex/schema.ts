import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * EliteSpeak analytics + shareable reports.
 * anonymousId = browser-local UUID.
 * firstName/email filled when user requests the PDF (lead capture).
 */
export default defineSchema({
  analyses: defineTable({
    anonymousId: v.string(),
    overallScore: v.number(),
    durationSec: v.union(v.number(), v.null()),
    level: v.string(),
    mainFocus: v.string(),
    source: v.optional(v.string()),
    /** realtime | upload | youtube */
    captureMethod: v.optional(v.string()),
    firstName: v.optional(v.string()),
    email: v.optional(v.string()),
    /** success | failed — omitted on older rows (treat score>0 as success). */
    status: v.optional(v.union(v.literal("success"), v.literal("failed"))),
    /** Short admin-facing reason when status is failed. */
    failureReason: v.optional(v.string()),
    /** Public share slug for /r/{slug}. */
    reportSlug: v.optional(v.string()),
    /** Estimated Gemini USD for this attempt (success or fail). */
    costUsd: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    /** Server wall time to produce result (ms), including YouTube prep when applicable. */
    analysisDurationMs: v.optional(v.number()),
    /** True when analysisDurationMs was inferred (legacy rows), not measured. */
    analysisDurationEstimated: v.optional(v.boolean()),
    /** Prompt add-on ids active when this analysis was scored. */
    promptAddOnIds: v.optional(v.array(v.string())),
    createdAt: v.number(), // ms epoch
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_anonymousId", ["anonymousId"])
    .index("by_anonymousId_createdAt", ["anonymousId", "createdAt"])
    .index("by_email", ["email"])
    .index("by_reportSlug", ["reportSlug"]),

  /** Full diagnosis payloads for shareable links. */
  sharedReports: defineTable({
    slug: v.string(),
    reportJson: v.string(),
    anonymousId: v.string(),
    overallScore: v.number(),
    level: v.string(),
    mainFocus: v.string(),
    firstName: v.optional(v.string()),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_createdAt", ["createdAt"]),

  /** Admin notes appended to the locked core diagnosis prompt for new analyses. */
  promptAddOns: defineTable({
    title: v.string(),
    body: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_enabled_createdAt", ["enabled", "createdAt"]),

  /** One-time report usefulness ratings (1–5). */
  surveyRatings: defineTable({
    rating: v.number(),
    comment: v.optional(v.string()),
    anonymousId: v.optional(v.string()),
    reportSlug: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_reportSlug", ["reportSlug"]),

  /**
   * Optional admin override of the core diagnosis system prompt.
   * At most one active row (key = "diagnosis"). Empty body = use code default.
   */
  diagnosisCorePrompt: defineTable({
    key: v.string(),
    body: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  /**
   * Paid coaching platform only. Isolated from the free analyzer funnel
   * (`analyses`, `sharedReports`, surveys, prompts).
   */
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("client"), v.literal("coach"), v.literal("admin")),
    passwordHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role_createdAt", ["role", "createdAt"]),

  /** One enrolled coaching client. Login and tasks come in later slices. */
  clients: defineTable({
    userId: v.id("users"),
    coachId: v.optional(v.id("users")),
    startDate: v.number(),
    currentFocus: v.optional(v.string()),
    /** One dedicated meeting URL for every call. */
    meetingLink: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
    ),
    lastActivityAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status_lastActivityAt", ["status", "lastActivityAt"])
    .index("by_createdAt", ["createdAt"]),

  /** Verbal Workout assigned after a call. Same shape, reused each cycle. */
  tasks: defineTable({
    clientId: v.id("clients"),
    sessionNumber: v.optional(v.number()),
    title: v.string(),
    instructions: v.string(),
    recordingRequired: v.boolean(),
    /** Default true when omitted (older tasks). */
    reviewRequired: v.optional(v.boolean()),
    status: v.union(
      v.literal("open"),
      v.literal("submitted"),
      v.literal("reviewed"),
      v.literal("done"),
    ),
    storageId: v.optional(v.id("_storage")),
    /** Google Drive share link for the client video. */
    driveUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    rating: v.optional(v.number()),
    ratingComment: v.optional(v.string()),
    /** Client may revise a submitted recording/note once. */
    clientRevisionUsed: v.optional(v.boolean()),
    /** Optional written response from the client. */
    responseText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_clientId_createdAt", ["clientId", "createdAt"])
    .index("by_clientId_status_createdAt", ["clientId", "status", "createdAt"]),

  /** Nine coaching cycles (1–9) plus Final Call (10). Intro Call uses sessionNumber 0 on tasks. */
  coachingSessions: defineTable({
    clientId: v.id("clients"),
    sessionNumber: v.number(),
    ready: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_clientId_sessionNumber", ["clientId", "sessionNumber"]),

  /**
   * Intro Call overview (Milestone 1). Written by admin after the 1:1 call.
   * Visible to admin and client. One report per client.
   */
  introCallReports: defineTable({
    clientId: v.id("clients"),
    summary: v.string(),
    challenges: v.array(v.object({ title: v.string(), body: v.string() })),
    coachingSchedule: v.string(),
    osItems: v.array(
      v.object({
        name: v.string(),
        goal: v.string(),
        body: v.string(),
      }),
    ),
    reps: v.array(v.object({ title: v.string(), body: v.string() })),
    updatedAt: v.number(),
  }).index("by_clientId", ["clientId"]),
});
