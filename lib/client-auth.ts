import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import type { CoachingClient } from "@/lib/coaching-clients";
import { coachingApi, getConvexHttpClient } from "@/lib/convex-server";
import type { ClientSession } from "@/lib/client-session";

export type MyClientResponse = {
  authenticated: boolean;
  client?: CoachingClient | null;
  needsRegistration?: boolean;
};

function toSession(row: CoachingClient): ClientSession {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    currentDay: row.currentDay,
    programDays: row.programDays,
    currentFocus: row.currentFocus,
    meetingLink: row.meetingLink,
    status: row.status,
    currentStage: row.currentStage,
    reviewRequired: row.reviewRequired,
    onboardingComplete: row.onboardingComplete,
  };
}

export async function fetchMyClientFromConvex(): Promise<MyClientResponse> {
  const convex = getConvexHttpClient();
  if (!convex) {
    return { authenticated: false };
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return { authenticated: false };
  }

  convex.setAuth(token);
  const data = (await convex.query(coachingApi.getMyClient, {})) as MyClientResponse;
  return data;
}

export async function getActiveClientSession(): Promise<{
  session: ClientSession;
  client: CoachingClient;
} | null> {
  const data = await fetchMyClientFromConvex();
  if (!data.authenticated || !data.client) return null;
  if (data.client.status !== "active") return null;
  return { session: toSession(data.client), client: data.client };
}

export async function getAuthedConvexClient() {
  const convex = getConvexHttpClient();
  if (!convex) return null;
  const token = await convexAuthNextjsToken();
  if (!token) return null;
  convex.setAuth(token);
  return convex;
}
