import {
  coachingApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";

export type SessionRecap = {
  sessionNumber: number;
  recapSummary: string;
  recapUpdatedAt: string;
};

export async function getSessionRecap(input: {
  clientId: string;
  sessionNumber: number;
}): Promise<SessionRecap | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;

  try {
    const row = (await client.query(coachingApi.getSessionRecap, {
      clientId: input.clientId as never,
      sessionNumber: input.sessionNumber,
    })) as {
      sessionNumber: number;
      recapSummary: string;
      recapUpdatedAt: number;
    } | null;
    if (!row?.recapSummary?.trim()) return null;
    return {
      sessionNumber: row.sessionNumber,
      recapSummary: row.recapSummary,
      recapUpdatedAt: new Date(row.recapUpdatedAt).toISOString(),
    };
  } catch (err) {
    console.error("[sessionRecap] get failed", formatConvexError(err), err);
    throw err;
  }
}

export async function saveSessionRecap(input: {
  clientId: string;
  sessionNumber: number;
  recapSummary: string;
  sourceTranscript?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) {
    return { ok: false, error: "Convex is not configured." };
  }
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.upsertSessionRecap, {
      clientId: input.clientId as never,
      sessionNumber: input.sessionNumber,
      recapSummary: input.recapSummary,
      sourceTranscript: input.sourceTranscript,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[sessionRecap] save failed", error, err);
    return { ok: false, error };
  }
}
