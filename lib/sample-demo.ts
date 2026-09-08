import type { ClientSession } from "@/lib/client-session";
import {
  getCoachingClientByEmail,
  type CoachingClient,
} from "@/lib/coaching-clients";
import {
  getLiveCallProgress,
  listCoachingSessions,
  sessionsForClientView,
} from "@/lib/coaching-sessions";
import { listCoachingTasks } from "@/lib/coaching-tasks";
import {
  demoSeedApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";
import { getIntroCallReport } from "@/lib/intro-call";
import { getSessionRecap } from "@/lib/session-recap";
import { SAMPLE_CLIENT_EMAIL } from "@/lib/sample-client";

function toClientSession(row: CoachingClient): ClientSession {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    currentDay: row.currentDay,
    programDays: row.programDays,
    currentFocus: row.currentFocus,
    meetingLink: row.meetingLink,
    status: row.status,
    currentStage: row.currentStage || "Intro Call",
    workSessionCount: row.workSessionCount ?? 9,
    reviewRequired: row.reviewRequired === true,
    onboardingComplete: row.onboardingComplete === true,
    socialProfiles: row.socialProfiles,
  };
}

export async function ensureSampleClientSeeded(): Promise<CoachingClient | null> {
  if (!isConvexConfigured()) return null;

  const convex = getConvexHttpClient();
  if (!convex) return null;

  try {
    await convex.action(demoSeedApi.seedSampleClient, {});
  } catch (err) {
    console.error("[sample-demo] seed failed", formatConvexError(err), err);
    throw err;
  }

  const client = await getCoachingClientByEmail(SAMPLE_CLIENT_EMAIL);
  if (!client) return null;

  try {
    await convex.action(demoSeedApi.ensureSampleSessionRecaps, {});
  } catch (err) {
    console.error(
      "[sample-demo] recap ensure failed",
      formatConvexError(err),
      err,
    );
    throw err;
  }

  return client;
}

export async function loadSampleDemoBundle() {
  const client = await ensureSampleClientSeeded();
  if (!client) {
    return null;
  }

  const [tasks, sessions, intro, progress] = await Promise.all([
    listCoachingTasks(client.id),
    listCoachingSessions(client.id),
    getIntroCallReport(client.id),
    getLiveCallProgress(client.id),
  ]);

  return {
    client: toClientSession(client),
    tasks,
    sessions: sessionsForClientView(sessions),
    intro,
    progress,
  };
}

export async function loadSampleSessionRecap(sessionNumber: number) {
  const client = await ensureSampleClientSeeded();
  if (!client) return null;

  const recap = await getSessionRecap({
    clientId: client.id,
    sessionNumber,
  });
  if (!recap) return null;

  return {
    sessionNumber: recap.sessionNumber,
    recapSummary: recap.recapSummary,
    recapUpdatedAt: recap.recapUpdatedAt,
  };
}
