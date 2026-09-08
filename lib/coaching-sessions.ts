import {
  coachingApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";
import {
  LIVE_CALL_TOTAL,
  WORK_SESSION_COUNT,
  sessionLabel,
  workAndFinalSlots,
} from "@/lib/coaching-program";

type ConvexClientLike = NonNullable<ReturnType<typeof getConvexHttpClient>>;

function resolveClient(provided?: ConvexClientLike | null) {
  return provided ?? getConvexHttpClient();
}

export const SESSION_COUNT = WORK_SESSION_COUNT + 1;

export type CoachingSessionSlot = {
  sessionNumber: number;
  ready: boolean;
  taskCount: number;
  callCompleted?: boolean;
  callCompletedAt?: string;
  /** Admin-only private notes. Never send to client APIs. */
  adminNotes?: string;
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

/** Strip private admin fields before returning sessions to a client. */
export function sessionsForClientView(
  sessions: CoachingSessionSlot[],
): CoachingSessionSlot[] {
  return sessions
    .filter((slot) => slot.sessionNumber >= 1)
    .map(({ adminNotes: _omit, ...slot }) => slot);
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

export async function addCoachingWorkSession(
  clientId: string,
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; workSessionCount?: number; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.addWorkSession, {
      clientId: clientId as never,
    })) as { ok?: boolean; workSessionCount?: number };
    return {
      ok: Boolean(result?.ok),
      workSessionCount: result?.workSessionCount,
    };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] addWorkSession failed", error, err);
    return { ok: false, error };
  }
}

export async function removeCoachingWorkSession(input: {
  clientId: string;
  sessionNumber: number;
}, convex?: ConvexClientLike | null): Promise<{
  ok: boolean;
  workSessionCount?: number;
  error?: string;
}> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.removeWorkSession, {
      clientId: input.clientId as never,
      sessionNumber: input.sessionNumber,
    })) as { ok?: boolean; workSessionCount?: number };
    return {
      ok: Boolean(result?.ok),
      workSessionCount: result?.workSessionCount,
    };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] removeWorkSession failed", error, err);
    return { ok: false, error };
  }
}

export async function setCoachingAdminNotes(input: {
  clientId: string;
  sessionNumber: number;
  adminNotes: string;
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.setAdminNotes, {
      clientId: input.clientId as never,
      sessionNumber: input.sessionNumber,
      adminNotes: input.adminNotes,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] setAdminNotes failed", error, err);
    return { ok: false, error };
  }
}

export function emptySessionSlots(
  workSessionCount: number = WORK_SESSION_COUNT,
): CoachingSessionSlot[] {
  return workAndFinalSlots(workSessionCount).map((sessionNumber) => ({
    sessionNumber,
    ready: false,
    taskCount: 0,
    callCompleted: false,
    callCompletedAt: "",
  }));
}

export function ensureSessionSlots(
  incoming?: CoachingSessionSlot[],
  workSessionCount: number = WORK_SESSION_COUNT,
): CoachingSessionSlot[] {
  const base = emptySessionSlots(workSessionCount);
  if (!incoming?.length) return base;
  const byNumber = new Map(
    incoming
      .filter((slot) => slot.sessionNumber >= 1)
      .map((slot) => [slot.sessionNumber, slot]),
  );
  return base.map((slot) => {
    const found = byNumber.get(slot.sessionNumber);
    if (!found) return slot;
    const { adminNotes: _omit, ...safe } = found;
    return { ...slot, ...safe };
  });
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

export function liveCallLabel(
  sessionNumber: number,
  workSessionCount?: number | null,
): string {
  return sessionLabel(sessionNumber, workSessionCount);
}
