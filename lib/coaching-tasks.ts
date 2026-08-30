import {
  coachingApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";

export type CoachingTaskStatus = "open" | "submitted" | "reviewed" | "done";

export type CoachingTask = {
  id: string;
  clientId: string;
  sessionNumber: number;
  title: string;
  instructions: string;
  recordingRequired: boolean;
  reviewRequired: boolean;
  status: CoachingTaskStatus;
  recordingUrl: string;
  driveUrl: string;
  durationSec: number | null;
  submittedAt: string;
  rating: number | null;
  ratingComment: string;
  responseText: string;
  clientRevisionUsed: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
};

export function taskStatusLabel(
  status: CoachingTaskStatus,
  viewer: "client" | "admin" = "client",
): string {
  if (status === "open") return "Open";
  if (status === "submitted") {
    return viewer === "admin" ? "Review required" : "In review";
  }
  if (status === "reviewed") return "Reviewed";
  if (status === "done") return "Done";
  return status;
}

export function needsCoachReview(task: {
  reviewRequired?: boolean;
}): boolean {
  return task.reviewRequired !== false;
}

export function isTaskLocked(status: CoachingTaskStatus): boolean {
  return status !== "open";
}

export async function listCoachingTasks(
  clientId: string,
): Promise<CoachingTask[]> {
  if (!isConvexConfigured()) return [];
  const client = getConvexHttpClient();
  if (!client) return [];

  try {
    return (await client.query(coachingApi.listTasksForClient, {
      clientId: clientId as never,
    })) as CoachingTask[];
  } catch (err) {
    console.error("[coaching] listTasks failed", formatConvexError(err), err);
    throw err;
  }
}

export async function createCoachingTask(input: {
  clientId: string;
  sessionNumber?: number;
  title: string;
  instructions: string;
  recordingRequired?: boolean;
  reviewRequired?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.createTask, {
      clientId: input.clientId as never,
      sessionNumber: input.sessionNumber,
      title: input.title,
      instructions: input.instructions,
      recordingRequired: input.recordingRequired,
      reviewRequired: input.reviewRequired,
    })) as { ok?: boolean; id?: string };
    return { ok: Boolean(result?.ok), id: result?.id };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] createTask failed", error, err);
    return { ok: false, error };
  }
}

export async function generateCoachingUploadUrl(): Promise<{
  ok: boolean;
  uploadUrl?: string;
  error?: string;
}> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const uploadUrl = (await client.mutation(
      coachingApi.generateUploadUrl,
      {},
    )) as string;
    return { ok: Boolean(uploadUrl), uploadUrl };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] uploadUrl failed", error, err);
    return { ok: false, error };
  }
}

export async function submitCoachingTask(input: {
  id: string;
  storageId?: string;
  driveUrl?: string;
  durationSec?: number;
  responseText?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.submitTask, {
      id: input.id as never,
      ...(input.storageId ? { storageId: input.storageId as never } : {}),
      driveUrl: input.driveUrl,
      durationSec: input.durationSec,
      responseText: input.responseText,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] submitTask failed", error, err);
    return { ok: false, error };
  }
}

export async function reviseCoachingTask(input: {
  id: string;
  storageId?: string;
  driveUrl?: string;
  durationSec?: number;
  responseText?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.reviseTask, {
      id: input.id as never,
      ...(input.storageId ? { storageId: input.storageId as never } : {}),
      driveUrl: input.driveUrl,
      durationSec: input.durationSec,
      responseText: input.responseText,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] reviseTask failed", error, err);
    return { ok: false, error };
  }
}

export async function updateCoachingTask(input: {
  id: string;
  title?: string;
  instructions?: string;
  recordingRequired?: boolean;
  reviewRequired?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.updateTask, {
      id: input.id as never,
      title: input.title,
      instructions: input.instructions,
      recordingRequired: input.recordingRequired,
      reviewRequired: input.reviewRequired,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] updateTask failed", error, err);
    return { ok: false, error };
  }
}

export async function rateCoachingTask(input: {
  id: string;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.rateTask, {
      id: input.id as never,
      rating: input.rating,
      comment: input.comment,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] rateTask failed", error, err);
    return { ok: false, error };
  }
}

export async function completeCoachingTask(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.completeTask, {
      id: id as never,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] completeTask failed", error, err);
    return { ok: false, error };
  }
}

export async function ensureCoachingProgram(
  clientId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.ensureProgramTasks, {
      clientId: clientId as never,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] ensureProgram failed", error, err);
    return { ok: false, error };
  }
}

export async function getCoachingTask(id: string): Promise<
  | (CoachingTask & { clientName: string })
  | null
> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;

  try {
    return ((await client.query(coachingApi.getTask, {
      id: id as never,
    })) as (CoachingTask & { clientName: string }) | null) ?? null;
  } catch (err) {
    console.error("[coaching] getTask failed", formatConvexError(err), err);
    throw err;
  }
}

export async function removeCoachingTask(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.removeTask, {
      id: id as never,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] removeTask failed", error, err);
    return { ok: false, error };
  }
}
