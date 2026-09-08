import {
  coachingApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";
import { INTRO_SESSION } from "@/lib/coaching-program";
import { formatTaskTitle } from "@/lib/workout-exercises";

type ConvexClientLike = NonNullable<ReturnType<typeof getConvexHttpClient>>;

function resolveClient(provided?: ConvexClientLike | null) {
  return provided ?? getConvexHttpClient();
}

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
  expectedMinutes: number | null;
};

export function taskStatusLabel(status: CoachingTaskStatus): string {
  if (status === "open") return "Open";
  if (status === "submitted") {
    return "Completed";
  }
  if (status === "reviewed") return "Reviewed";
  if (status === "done") return "Done";
  return status;
}

export function needsCoachReview(task: {
  recordingRequired?: boolean;
}): boolean {
  return task.recordingRequired === true;
}

export function usesVideoLink(task: {
  sessionNumber?: number;
  recordingRequired?: boolean;
}): boolean {
  return task.recordingRequired === true && (task.sessionNumber ?? 1) === INTRO_SESSION;
}

export type TaskResponseKind = "record" | "lesson";

export function taskResponseKind(task: {
  recordingRequired?: boolean;
}): TaskResponseKind {
  return task.recordingRequired === true ? "record" : "lesson";
}

export function isTaskLocked(status: CoachingTaskStatus): boolean {
  return status !== "open";
}

export function isTaskFinished(status: CoachingTaskStatus): boolean {
  return status === "submitted" || status === "reviewed" || status === "done";
}

export async function listCoachingTasks(
  clientId: string,
  convex?: ConvexClientLike | null,
): Promise<CoachingTask[]> {
  if (!isConvexConfigured()) return [];
  const client = resolveClient(convex);
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
  expectedMinutes?: number;
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.createTask, {
      clientId: input.clientId as never,
      sessionNumber: input.sessionNumber,
      title: formatTaskTitle(input.title, input.expectedMinutes),
      instructions: input.instructions,
      recordingRequired: input.recordingRequired,
      reviewRequired: input.reviewRequired,
      expectedMinutes: input.expectedMinutes,
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
} > {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient();
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
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
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
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
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
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
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

export async function markCoachingTaskReviewed(
  id: string,
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.markTaskReviewed, {
      id: id as never,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] markTaskReviewed failed", error, err);
    return { ok: false, error };
  }
}

export async function setCoachingTaskCoachComment(
  input: { id: string; comment: string },
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) {
    return { ok: false, error: "Convex is not configured." };
  }
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.setTaskCoachComment, {
      id: input.id as never,
      comment: input.comment,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] setTaskCoachComment failed", error, err);
    return { ok: false, error };
  }
}

export async function rateCoachingTask(input: {
  id: string;
  rating?: number;
  comment?: string;
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  return markCoachingTaskReviewed(input.id, convex);
}

export async function completeCoachingTask(
  id: string,
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
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
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
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

export async function getCoachingTask(
  id: string,
  convex?: ConvexClientLike | null,
): Promise<
  | (CoachingTask & { clientName: string })
  | null
> {
  if (!isConvexConfigured()) return null;
  const client = resolveClient(convex);
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
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
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
