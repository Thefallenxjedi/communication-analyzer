import {
  coachingApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";

export const SESSION_COUNT = 10;

export type CoachingSessionSlot = {
  sessionNumber: number;
  ready: boolean;
  taskCount: number;
};

export async function listCoachingSessions(
  clientId: string,
): Promise<CoachingSessionSlot[]> {
  if (!isConvexConfigured()) return [];
  const client = getConvexHttpClient();
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

export async function markCoachingSessionReady(input: {
  clientId: string;
  sessionNumber: number;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
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
  }));
}
