import {
  coachingApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";
import { isSampleClientEmail } from "@/lib/sample-client";

type ConvexClientLike = NonNullable<ReturnType<typeof getConvexHttpClient>>;

function resolveClient(provided?: ConvexClientLike | null) {
  return provided ?? getConvexHttpClient();
}

export type CoachingClientStatus = "pending" | "active" | "paused" | "completed";

export type CoachingClient = {
  id: string;
  userId: string;
  name: string;
  email: string;
  startDate: string;
  currentDay: number;
  programDays: number;
  currentFocus: string;
  meetingLink: string;
  status: CoachingClientStatus;
  currentStage: string;
  /** Middle work sessions (1..N). Intro + Final stay fixed. Default 9. */
  workSessionCount: number;
  reviewRequired: boolean;
  pendingReviews: number;
  lastActivityAt: string;
  createdAt: string;
  onboardingComplete: boolean;
  onboardingRole: string;
  onboardingCompany: string;
  onboardingGoal: string;
  linkedinProfileJson: string;
  linkedinText: string;
  socialProfiles: string[];
  /** Private staff-only notes returned only by the admin detail query. */
  adminNotes?: string;
};

export async function getCoachingClientByEmail(
  email: string,
  convex?: ConvexClientLike | null,
): Promise<CoachingClient | null> {
  if (!isConvexConfigured()) return null;
  const client = resolveClient(convex);
  if (!client) return null;

  try {
    return ((await client.query(coachingApi.getClientByEmail, {
      email,
    })) as CoachingClient | null) ?? null;
  } catch (err) {
    console.error("[coaching] getByEmail failed", formatConvexError(err), err);
    throw err;
  }
}

export async function getCoachingClient(
  id: string,
  convex?: ConvexClientLike | null,
): Promise<CoachingClient | null> {
  if (!isConvexConfigured()) return null;
  const client = resolveClient(convex);
  if (!client) return null;

  try {
    return ((await client.query(coachingApi.getClient, {
      id: id as never,
    })) as CoachingClient | null) ?? null;
  } catch (err) {
    console.error("[coaching] getClient failed", formatConvexError(err), err);
    throw err;
  }
}

export async function listCoachingClients(
  convex?: ConvexClientLike | null,
): Promise<CoachingClient[]> {
  if (!isConvexConfigured()) return [];
  const client = resolveClient(convex);
  if (!client) return [];

  try {
    return (await client.query(coachingApi.listClients, {})) as CoachingClient[];
  } catch (err) {
    console.error("[coaching] list failed", formatConvexError(err), err);
    throw err;
  }
}

export async function createCoachingClient(input: {
  name: string;
  email: string;
  startDate?: string;
  currentFocus?: string;
  meetingLink?: string;
}, convex?: ConvexClientLike | null): Promise<{
  ok: boolean;
  id?: string;
  alreadyExisted?: boolean;
  error?: string;
}> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.createClient, {
      name: input.name,
      email: input.email,
      startDate: input.startDate,
      currentFocus: input.currentFocus,
      meetingLink: input.meetingLink,
    })) as { ok?: boolean; id?: string; alreadyExisted?: boolean };
    return {
      ok: Boolean(result?.ok),
      id: result?.id,
      alreadyExisted: Boolean(result?.alreadyExisted),
    };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] create failed", error, err);
    return { ok: false, error };
  }
}

export async function updateCoachingClient(input: {
  id: string;
  currentFocus?: string;
  status?: CoachingClientStatus;
  startDate?: string;
  meetingLink?: string;
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.updateClient, {
      id: input.id as never,
      currentFocus: input.currentFocus,
      status: input.status,
      startDate: input.startDate,
      meetingLink: input.meetingLink,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] update failed", error, err);
    return { ok: false, error };
  }
}

export async function setCoachingClientAdminNotes(
  input: { id: string; adminNotes: string },
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) {
    return { ok: false, error: "Convex is not configured." };
  }
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.setClientAdminNotes, {
      id: input.id as never,
      adminNotes: input.adminNotes,
    })) as { ok?: boolean };
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] setAdminNotes failed", error, err);
    return { ok: false, error };
  }
}

export async function removeCoachingClient(
  id: string,
  convex?: ConvexClientLike | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const row = await getCoachingClient(id, client);
    if (row && isSampleClientEmail(row.email)) {
      return {
        ok: false,
        error: "The sample demo client cannot be removed.",
      };
    }

    const result = (await client.mutation(coachingApi.removeClient, {
      id: id as never,
    })) as { ok?: boolean; reason?: string };
    if (!result?.ok && result?.reason === "sample_client") {
      return {
        ok: false,
        error: "The sample demo client cannot be removed.",
      };
    }
    return { ok: Boolean(result?.ok) };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] remove failed", error, err);
    return { ok: false, error };
  }
}

export async function getCoachingStorageUrl(
  storageId: string,
  convex?: ConvexClientLike | null,
): Promise<string | null> {
  if (!isConvexConfigured()) return null;
  const client = resolveClient(convex);
  if (!client) return null;
  try {
    return ((await client.query(coachingApi.getStorageUrl, {
      storageId: storageId as never,
    })) as string | null) ?? null;
  } catch (err) {
    console.error("[coaching] storage url failed", formatConvexError(err), err);
    return null;
  }
}

export async function saveClientOnboarding(input: {
  clientId: string;
  role?: string;
  company?: string;
  goal?: string;
  linkedinStorageId?: string;
  linkedinText?: string;
  linkedinProfileJson?: string;
  socialProfiles?: string[];
}, convex?: ConvexClientLike | null): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = resolveClient(convex);
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(coachingApi.saveOnboarding, {
      clientId: input.clientId as never,
      role: input.role,
      company: input.company,
      goal: input.goal,
      ...(input.linkedinStorageId
        ? { linkedinStorageId: input.linkedinStorageId as never }
        : {}),
      linkedinText: input.linkedinText,
      linkedinProfileJson: input.linkedinProfileJson,
      socialProfiles: input.socialProfiles,
    })) as { ok?: boolean; reason?: string };
    if (!result?.ok) {
      return {
        ok: false,
        error: "Could not save profiles.",
      };
    }
    return { ok: true };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[coaching] profile save failed", error, err);
    return { ok: false, error };
  }
}
