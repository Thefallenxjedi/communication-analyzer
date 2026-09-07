import {
  coachingApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";
import {
  LIVE_CALL_TOTAL,
  sessionLabel,
} from "@/lib/coaching-program";

type ConvexClientLike = NonNullable<ReturnType<typeof getConvexHttpClient>>;

function resolveClient(provided?: ConvexClientLike | null) {
  return provided ?? getConvexHttpClient();
}

export const SESSION_COUNT = 10;

export type CoachingSessionSlot = {
  sessionNumber: number;
  ready: boolean;
  taskCount: number;
  callCompleted?: boolean;
  callCompletedAt?: string;
};

export type LiveCallProgress = {
  total: number;
  completed: number;
  remaining: number;
  calls: Array<{
    sessionNumber: number;
    label: string;
    completed: boolean;
    completedAt: string;
  }>;
};

export async function listCoachingSessions(
  clientId: string,
  convex?: ConvexClientLike | null,
): Promise<CoachingSessionSlot[]> {
  if (!isConvexConfigured()) return [];
  const client = resolveClient(convex);
  if (!client) return [];

  try {
    return (await client.query(coachingApi.listSessions, {
      clientId: clientId as never,
    })) as CoachingSessionSlot[];
  } catch (err) {
    console.error("[coaching] listSessions failed", formatConvexError(err), err);
    throw err;
  }
}

export async function getLiveCallProgress(
  clientId: string,
  convex?: ConvexClientLike | null,
): Promise<LiveCallProgress> {
  if (!isConvexConfigured()) {
    return emptyLiveCallProgress();
  }
  const client = resolveClient(convex);
  if (!client) return emptyLiveCallProgress();

  try {
    return (await client.query(coachingApi.getLiveCallProgress, {
      clientId: clientId as never,
    })) as LiveCallProgress;
  } catch (err) {
    console.error(
      "[coaching] getLiveCallProgress failed",
      formatConvexError(err),
      err,
    );
    throw err;
  }
}

export function emptyLiveCallProgress(): LiveCallProgress {
  return {
    total: LIVE_CALL_TOTAL,
    completed: 0,
    remaining: LIVE_CALL_TOTAL,
    calls: [],
  };
}

export async function markCoachingSessionReady(input: {
  clientId: string;
  sessionNumber: number;
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.markSessionReady, {
      clientId: input.clientId as never,
      sessionNumber: input.sessionNumber,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] markReady failed", error, err);
    return { ok: false, error };
  }
}

export function emptySessionSlots(): CoachingSessionSlot[] {
  return Array.from({ length: SESSION_COUNT }, (_, i) => ({
    sessionNumber: i + 1,
    ready: false,
    taskCount: 0,
    callCompleted: false,
    callCompletedAt: "",
  }));
}

export function ensureSessionSlots(
  incoming?: CoachingSessionSlot[],
): CoachingSessionSlot[] {
  const base = emptySessionSlots();
  if (!incoming?.length) return base;
  const byNumber = new Map(incoming.map((slot) => [slot.sessionNumber, slot]));
  return base.map((slot) => byNumber.get(slot.sessionNumber) ?? slot);
}

export function callCompletedForSession(
  progress: LiveCallProgress | null | undefined,
  sessionNumber: number,
): boolean {
  return Boolean(
    progress?.calls.find((call) => call.sessionNumber === sessionNumber)
      ?.completed,
  );
}

export function liveCallLabel(sessionNumber: number): string {
  return sessionLabel(sessionNumber);
}
