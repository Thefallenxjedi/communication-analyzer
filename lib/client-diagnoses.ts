import type { DiagnosisReport } from "@/lib/schema";
import { diagnosisReportSchema } from "@/lib/schema";

export type ClientDiagnosisStatus = "completed" | "failed";

export type ClientDiagnosis = {
  id: string;
  clientId: string;
  status: ClientDiagnosisStatus;
  captureMethod: string;
  recordingUrl: string;
  durationSec: number | null;
  promptQuestion: string;
  transcript: string;
  overallScore: number | null;
  level: string;
  mainFocus: string;
  shareSlug: string;
  reportJson: string;
  failureReason: string;
  createdAt: string;
  updatedAt: string;
  report: DiagnosisReport | null;
  sharePath: string;
};

export function parseClientDiagnosis(input: {
  id: string;
  clientId: string;
  status: ClientDiagnosisStatus;
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
}): ClientDiagnosis {
  const reportRaw = input.reportJson?.trim() || "";
  const report =
    reportRaw
      ? (() => {
          try {
            const parsed = diagnosisReportSchema.safeParse(JSON.parse(reportRaw));
            return parsed.success ? parsed.data : null;
          } catch {
            return null;
          }
        })()
      : null;

  const shareSlug = input.shareSlug?.trim().toLowerCase() || "";
  return {
    id: input.id,
    clientId: input.clientId,
    status: input.status,
    captureMethod: input.captureMethod || "",
    recordingUrl: input.recordingUrl || "",
    durationSec:
      typeof input.durationSec === "number" && Number.isFinite(input.durationSec)
        ? input.durationSec
        : null,
    promptQuestion: input.promptQuestion || "",
    transcript: input.transcript || "",
    overallScore:
      typeof input.overallScore === "number" && Number.isFinite(input.overallScore)
        ? input.overallScore
        : null,
    level: input.level || "",
    mainFocus: input.mainFocus || "",
    shareSlug,
    reportJson: reportRaw,
    failureReason: input.failureReason || "",
    createdAt: input.createdAt || "",
    updatedAt: input.updatedAt || "",
    report,
    sharePath: shareSlug ? `/r/${shareSlug}` : "",
  };
}
