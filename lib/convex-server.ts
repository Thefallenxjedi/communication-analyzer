import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

/** Prefer server-only URL; fall back to public (works on Vercel either way). */
export function getConvexUrl(): string {
  const raw =
    process.env.CONVEX_URL?.trim() ||
    process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ||
    "";
  return raw.replace(/^["']|["']$/g, "").replace(/\/$/, "");
}

export function isConvexConfigured(): boolean {
  return Boolean(getConvexUrl());
}

export function getConvexHttpClient(): ConvexHttpClient | null {
  const url = getConvexUrl();
  if (!url) return null;
  if (!/^https:\/\/[a-z0-9-]+\.convex\.cloud$/i.test(url)) {
    console.error("[convex] unexpected URL shape:", url);
  }
  return new ConvexHttpClient(url);
}

export const analysesApi = {
  insert: makeFunctionReference<"mutation">("analyses:insert"),
  attachLead: makeFunctionReference<"mutation">("analyses:attachLead"),
  remove: makeFunctionReference<"mutation">("analyses:remove"),
  removeMany: makeFunctionReference<"mutation">("analyses:removeMany"),
  listRecent: makeFunctionReference<"query">("analyses:listRecent"),
  getStats: makeFunctionReference<"query">("analyses:getStats"),
  scoreTopPercent: makeFunctionReference<"query">("analyses:scoreTopPercent"),
  backfillAnalysisDuration: makeFunctionReference<"mutation">(
    "analyses:backfillAnalysisDuration",
  ),
};

export const reportsApi = {
  create: makeFunctionReference<"mutation">("reports:create"),
  getBySlug: makeFunctionReference<"query">("reports:getBySlug"),
};

export const surveysApi = {
  submit: makeFunctionReference<"mutation">("surveys:submit"),
  hasRated: makeFunctionReference<"query">("surveys:hasRated"),
  listRecent: makeFunctionReference<"query">("surveys:listRecent"),
  getStats: makeFunctionReference<"query">("surveys:getStats"),
  ratingsBySlugs: makeFunctionReference<"query">("surveys:ratingsBySlugs"),
};

export const promptAddOnsApi = {
  list: makeFunctionReference<"query">("promptAddOns:list"),
  listEnabled: makeFunctionReference<"query">("promptAddOns:listEnabled"),
  create: makeFunctionReference<"mutation">("promptAddOns:create"),
  update: makeFunctionReference<"mutation">("promptAddOns:update"),
  setEnabled: makeFunctionReference<"mutation">("promptAddOns:setEnabled"),
  remove: makeFunctionReference<"mutation">("promptAddOns:remove"),
};

export const diagnosisCorePromptApi = {
  get: makeFunctionReference<"query">("diagnosisCorePrompt:get"),
  set: makeFunctionReference<"mutation">("diagnosisCorePrompt:set"),
  clear: makeFunctionReference<"mutation">("diagnosisCorePrompt:clear"),
};

export const transcriptPromptsApi = {
  get: makeFunctionReference<"query">("transcriptPrompts:get"),
  set: makeFunctionReference<"mutation">("transcriptPrompts:set"),
  clear: makeFunctionReference<"mutation">("transcriptPrompts:clear"),
};

/** Paid coaching clients — not the free analyzer funnel. */
export const coachingApi = {
  approveClientSignup: makeFunctionReference<"mutation">("coaching:approveClientSignup"),
  listPendingClients: makeFunctionReference<"query">("coaching:listPendingClients"),
  getMyClient: makeFunctionReference<"query">("coaching:getMyClient"),
  registerClientSignup: makeFunctionReference<"mutation">("coaching:registerClientSignup"),
  listClients: makeFunctionReference<"query">("coaching:listClients"),
  getClientByEmail: makeFunctionReference<"query">("coaching:getClientByEmail"),
  createClient: makeFunctionReference<"mutation">("coaching:createClient"),
  updateClient: makeFunctionReference<"mutation">("coaching:updateClient"),
  removeClient: makeFunctionReference<"mutation">("coaching:removeClient"),
  getClient: makeFunctionReference<"query">("coaching:getClient"),
  listTasksForClient: makeFunctionReference<"query">("coaching:listTasksForClient"),
  getTask: makeFunctionReference<"query">("coaching:getTask"),
  createTask: makeFunctionReference<"mutation">("coaching:createTask"),
  ensureProgramTasks: makeFunctionReference<"mutation">("coaching:ensureProgramTasks"),
  listSessions: makeFunctionReference<"query">("coachingSessions:listForClient"),
  markSessionReady: makeFunctionReference<"mutation">("coachingSessions:markReady"),
  getSessionRecap: makeFunctionReference<"query">("coachingSessions:getRecap"),
  upsertSessionRecap: makeFunctionReference<"mutation">("coachingSessions:upsertRecap"),
  getLiveCallProgress: makeFunctionReference<"query">(
    "coachingSessions:getLiveCallProgress",
  ),
  markLiveCallComplete: makeFunctionReference<"mutation">(
    "coachingSessions:markLiveCallComplete",
  ),
  addWorkSession: makeFunctionReference<"mutation">(
    "coachingSessions:addWorkSession",
  ),
  removeWorkSession: makeFunctionReference<"mutation">(
    "coachingSessions:removeWorkSession",
  ),
  setAdminNotes: makeFunctionReference<"mutation">(
    "coachingSessions:setAdminNotes",
  ),
  generateUploadUrl: makeFunctionReference<"mutation">("coaching:generateUploadUrl"),
  getStorageUrl: makeFunctionReference<"query">("coaching:getStorageUrl"),
  saveOnboarding: makeFunctionReference<"mutation">("coaching:saveOnboarding"),
  submitTask: makeFunctionReference<"mutation">("coaching:submitTask"),
  reviseTask: makeFunctionReference<"mutation">("coaching:reviseTask"),
  updateTask: makeFunctionReference<"mutation">("coaching:updateTask"),
  completeTask: makeFunctionReference<"mutation">("coaching:completeTask"),
  rateTask: makeFunctionReference<"mutation">("coaching:rateTask"),
  markTaskReviewed: makeFunctionReference<"mutation">("coaching:markTaskReviewed"),
  removeTask: makeFunctionReference<"mutation">("coaching:removeTask"),
};

export const staffApi = {
  getMyStaff: makeFunctionReference<"query">("staff:getMyStaff"),
  listStaff: makeFunctionReference<"query">("staff:listStaff"),
  setStaffRole: makeFunctionReference<"mutation">("staff:setStaffRole"),
  tryBootstrapAdmin: makeFunctionReference<"mutation">("staff:tryBootstrapAdmin"),
};

export const introCallApi = {
  getByClient: makeFunctionReference<"query">("introCall:getByClient"),
  upsert: makeFunctionReference<"mutation">("introCall:upsert"),
};

export const demoSeedApi = {
  seedSampleClient: makeFunctionReference<"action">("demoSeed:seedSampleClient"),
  ensureSampleSessionRecaps: makeFunctionReference<"action">(
    "demoSeed:ensureSampleSessionRecaps",
  ),
};

export const workoutCatalogApi = {
  list: makeFunctionReference<"query">("workoutCatalog:list"),
  getBySlug: makeFunctionReference<"query">("workoutCatalog:getBySlug"),
  upsert: makeFunctionReference<"mutation">("workoutCatalog:upsert"),
  setEnabled: makeFunctionReference<"mutation">("workoutCatalog:setEnabled"),
  remove: makeFunctionReference<"mutation">("workoutCatalog:remove"),
  removeMany: makeFunctionReference<"mutation">("workoutCatalog:removeMany"),
  seedBatch: makeFunctionReference<"mutation">("workoutCatalog:seedBatch"),
};

export const clientDiagnosesApi = {
  listMine: makeFunctionReference<"query">("clientDiagnoses:listMine"),
  createMine: makeFunctionReference<"mutation">("clientDiagnoses:createMine"),
};

export function formatConvexError(err: unknown): string {
  if (err == null) return "Unknown Convex error";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const message = err.message || err.name || "Error";
    const cleaned = message
      .replace(/^\[Request ID: [^\]]+\]\s*/i, "")
      .replace(/^Server Error\s*/i, "")
      .trim();
    const extra =
      "data" in err && (err as { data?: unknown }).data != null
        ? ` ${JSON.stringify((err as { data?: unknown }).data)}`
        : "";
    return `${cleaned || message}${extra}`.trim();
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
