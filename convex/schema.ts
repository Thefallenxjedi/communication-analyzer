import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * EliteSpeak analytics.
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
    firstName: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.number(), // ms epoch
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_anonymousId", ["anonymousId"])
    .index("by_anonymousId_createdAt", ["anonymousId", "createdAt"])
    .index("by_email", ["email"]),
});
