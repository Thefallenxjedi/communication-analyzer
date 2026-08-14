import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidLeadEmail } from "@/lib/email";
import {
  isKartraConfigured,
  syncReportToKartra,
} from "@/lib/kartra";
import type { DiagnosisReport } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Backup Kartra sync after the user already has their report.
 * Analyze returns immediately and also schedules Kartra via `after()`;
 * this endpoint covers cases where background work was cut short.
 */
const bodySchema = z.object({
  email: z.string(),
  firstName: z.string().optional(),
  report: z.object({
    overallScore: z.number().min(0).max(100),
    level: z.string(),
    mainChallenge: z.object({
      title: z.string(),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
    }),
  }),
});

export async function POST(request: Request) {
  try {
    if (!isKartraConfigured()) {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_configured" });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload." },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    if (!isValidLeadEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email." },
        { status: 400 },
      );
    }

    const firstName =
      (parsed.data.firstName || "Friend").trim().split(/\s+/)[0].slice(0, 80) ||
      "Friend";

    // syncReportToKartra only reads score / level / mainChallenge fields.
    const report = {
      overallScore: parsed.data.report.overallScore,
      level: parsed.data.report.level,
      mainChallenge: {
        title: parsed.data.report.mainChallenge.title,
        strengths: parsed.data.report.mainChallenge.strengths,
        improvements: parsed.data.report.mainChallenge.improvements,
        imageKey: "default",
      },
      minorChallenges: "",
      stats: [],
      solutionsCopy: "",
      transcript: "",
    } as DiagnosisReport;

    const result = await syncReportToKartra({
      email,
      firstName,
      report,
    });

    if (!result.ok) {
      console.error("[kartra-sync] failed", result.message, result.raw);
      return NextResponse.json(
        { ok: false, error: result.message || "Kartra sync failed" },
        { status: 502 },
      );
    }

    console.info("[kartra-sync] ok", { email });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[kartra-sync]", err);
    return NextResponse.json(
      { ok: false, error: "Kartra sync failed." },
      { status: 500 },
    );
  }
}
