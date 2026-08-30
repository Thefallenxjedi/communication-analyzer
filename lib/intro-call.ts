import {
  formatConvexError,
  getConvexHttpClient,
  introCallApi,
  isConvexConfigured,
} from "@/lib/convex-server";

export type IntroCallChallenge = { title: string; body: string };
export type IntroCallOsItem = { name: string; goal: string; body: string };
export type IntroCallRep = { title: string; body: string };

export type IntroCallReport = {
  id: string;
  clientId: string;
  summary: string;
  challenges: IntroCallChallenge[];
  coachingSchedule: string;
  osItems: IntroCallOsItem[];
  reps: IntroCallRep[];
  updatedAt: string;
};

export function emptyIntroCall(clientId = ""): Omit<IntroCallReport, "id" | "updatedAt"> {
  return {
    clientId,
    summary: "",
    challenges: [{ title: "", body: "" }],
    coachingSchedule: "",
    osItems: [{ name: "", goal: "", body: "" }],
    reps: [{ title: "", body: "" }],
  };
}

export function isIntroCallEmpty(report: IntroCallReport | null): boolean {
  if (!report) return true;
  return (
    !report.summary.trim() &&
    !report.coachingSchedule.trim() &&
    report.challenges.every((item) => !item.title.trim() && !item.body.trim()) &&
    report.osItems.every(
      (item) => !item.name.trim() && !item.goal.trim() && !item.body.trim(),
    ) &&
    report.reps.every((item) => !item.title.trim() && !item.body.trim())
  );
}

export async function getIntroCallReport(
  clientId: string,
): Promise<IntroCallReport | null> {
  if (!isConvexConfigured()) return null;
  const client = getConvexHttpClient();
  if (!client) return null;

  try {
    return ((await client.query(introCallApi.getByClient, {
      clientId: clientId as never,
    })) as IntroCallReport | null) ?? null;
  } catch (err) {
    console.error("[introCall] get failed", formatConvexError(err), err);
    throw err;
  }
}

export async function saveIntroCallReport(input: {
  clientId: string;
  summary: string;
  challenges: IntroCallChallenge[];
  coachingSchedule: string;
  osItems: IntroCallOsItem[];
  reps: IntroCallRep[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex is not configured." };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex is not configured." };

  try {
    const result = (await client.mutation(introCallApi.upsert, {
      clientId: input.clientId as never,
      summary: input.summary,
      challenges: input.challenges,
      coachingSchedule: input.coachingSchedule,
      osItems: input.osItems,
      reps: input.reps,
    })) as { ok?: boolean; id?: string };
    return { ok: Boolean(result?.ok), id: result?.id };
  } catch (err) {
    const error = formatConvexError(err);
    console.error("[introCall] save failed", error, err);
    return { ok: false, error };
  }
}
