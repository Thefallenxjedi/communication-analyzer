import { POST as analyzePost } from "@/app/api/analyze/route";
import { getActiveClientSession, getAuthedConvexClient } from "@/lib/client-auth";
import { parseClientDiagnosis } from "@/lib/client-diagnoses";
import { getCoachingStorageUrl } from "@/lib/coaching-clients";
import { clientDiagnosesApi, isConvexConfigured } from "@/lib/convex-server";
import { diagnosisReportSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const convex = await getAuthedConvexClient();
  if (!convex) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const rows = (await convex.query(clientDiagnosesApi.listMine, {})) as Array<{
    id: string;
    clientId: string;
    status: "completed" | "failed";
    captureMethod?: string;
    recordingUrl?: string;
    durationSec?: number | null;
    promptQuestion?: string;
    transcript?: string;
    overallScore?: number | null;
    level?: string;
    mainFocus?: string;
    shareSlug?: string;
    reportJson?: string;
    failureReason?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;

  return Response.json({
    diagnoses: rows.map((row) => parseClientDiagnosis(row)),
  });
}

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const convex = await getAuthedConvexClient();
  if (!convex) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { storageId?: string; durationSec?: number; promptQuestion?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const storageId = body.storageId?.trim() || "";
  const promptQuestion = body.promptQuestion?.replace(/\s+/g, " ").trim() || "";
  const durationSec =
    typeof body.durationSec === "number" && Number.isFinite(body.durationSec) && body.durationSec > 0
      ? Math.round(body.durationSec)
      : undefined;

  if (!storageId) {
    return Response.json({ error: "Record audio first." }, { status: 400 });
  }

  const fileUrl = await getCoachingStorageUrl(storageId);
  if (!fileUrl) {
    return Response.json({ error: "Could not read that recording." }, { status: 400 });
  }

  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    return Response.json({ error: "Could not download that recording." }, { status: 400 });
  }

  const contentType =
    fileRes.headers.get("content-type")?.split(";")[0].trim() || "audio/webm";
  const buffer = await fileRes.arrayBuffer();
  const formData = new FormData();
  formData.append(
    "audio",
    new Blob([buffer], { type: contentType }),
    `client-diagnosis.${contentType.includes("mp4") ? "m4a" : "webm"}`,
  );
  formData.append("anonymousId", `client_${active.client.id}_${Date.now().toString(36)}`);
  formData.append("firstName", active.client.name.split(/\s+/)[0] || active.client.name);
  formData.append("email", active.client.email || "");
  formData.append("source", "client-portal");
  formData.append("captureMethod", "upload");
  if (durationSec) formData.append("durationSec", String(durationSec));
  if (promptQuestion) formData.append("promptQuestion", promptQuestion);

  const analyzeRequest = new Request(new URL("/api/analyze", request.url), {
    method: "POST",
    body: formData,
  });

  const analyzeResponse = await analyzePost(analyzeRequest);
  const analyzeData = (await analyzeResponse.json()) as { error?: string } & Record<string, unknown>;

  if (!analyzeResponse.ok) {
    await convex.mutation(clientDiagnosesApi.createMine, {
      storageId: storageId as never,
      durationSec,
      promptQuestion: promptQuestion || undefined,
      captureMethod: "upload",
      status: "failed",
      failureReason: analyzeData.error || "Diagnosis failed.",
    });
    return Response.json(
      { error: analyzeData.error || "Diagnosis failed." },
      { status: analyzeResponse.status },
    );
  }

  const parsed = diagnosisReportSchema.safeParse(analyzeData);
  if (!parsed.success) {
    await convex.mutation(clientDiagnosesApi.createMine, {
      storageId: storageId as never,
      durationSec,
      promptQuestion: promptQuestion || undefined,
      captureMethod: "upload",
      status: "failed",
      failureReason: "Diagnosis response was incomplete.",
    });
    return Response.json(
      { error: "Diagnosis response was incomplete." },
      { status: 500 },
    );
  }

  const report = parsed.data;
  const shareSlug =
    typeof analyzeData.shareSlug === "string" ? analyzeData.shareSlug.trim().toLowerCase() : "";

  await convex.mutation(clientDiagnosesApi.createMine, {
    storageId: storageId as never,
    durationSec,
    promptQuestion: promptQuestion || undefined,
    captureMethod: "upload",
    status: "completed",
    transcript: report.transcript,
    overallScore: report.overallScore,
    level: report.level,
    mainFocus: report.mainChallenge?.title,
    shareSlug: shareSlug || undefined,
    reportJson: JSON.stringify(report),
  });

  return Response.json({
    diagnosis: parseClientDiagnosis({
      id: `client-diagnosis-${Date.now()}`,
      clientId: active.client.id,
      status: "completed",
      captureMethod: "upload",
      recordingUrl: fileUrl,
      durationSec: durationSec ?? null,
      promptQuestion,
      transcript: report.transcript,
      overallScore: report.overallScore,
      level: report.level,
      mainFocus: report.mainChallenge?.title,
      shareSlug,
      reportJson: JSON.stringify(report),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  });
}
