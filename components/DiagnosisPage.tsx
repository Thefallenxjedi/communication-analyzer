"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { DiagnosisReport, StatId } from "@/lib/schema";
import { STAT_HINTS } from "@/lib/schema";
import { buildPartASections, buildPartBSections } from "@/lib/scoring";
import { ChallengeVisual } from "@/components/ChallengeVisual";
import {
  DIAGNOSIS_CALL_URL,
  downloadReportPdf,
} from "@/lib/report-pdf";
import { validateEmail } from "@/lib/email";
import { getOrCreateAnonymousId } from "@/lib/anonymous-id";
import { readLead, saveLead } from "@/lib/lead";

type DiagnosisPageProps = {
  report: DiagnosisReport;
};

function scoreStroke(score100: number): string {
  if (score100 >= 70) return "stroke-emerald-600";
  if (score100 >= 50) return "stroke-amber-500";
  return "stroke-accent";
}

function barFill(score100: number): string {
  if (score100 >= 70) return "bg-emerald-600";
  if (score100 >= 50) return "bg-amber-500";
  return "bg-accent";
}

function CircularScore({
  score,
  label,
  hint,
}: {
  score: number;
  label: string;
  hint?: string;
}) {
  const size = 72;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const offset = c * (1 - clamped / 100);

  return (
    <li className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-track"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className={scoreStroke(clamped)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums text-foreground">
          {clamped}
        </span>
      </div>
      <p className="mt-2 w-full text-[11px] font-semibold leading-snug text-foreground sm:text-xs">
        {label}
      </p>
      {hint ? (
        <p
          className="mt-1 line-clamp-2 w-full text-[10px] leading-snug text-muted sm:text-[11px]"
          title={hint}
        >
          {hint}
        </p>
      ) : null}
    </li>
  );
}

function RankBlock({
  heading,
  subheading,
  sections,
}: {
  heading: string;
  subheading: string;
  sections: ReturnType<typeof buildPartASections>;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-foreground/15 bg-highlight px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          {heading}
        </h2>
        <p className="mt-1 text-sm text-foreground/80">{subheading}</p>
      </div>

      <div className="mt-8 space-y-10">
        {sections.map((section, i) => (
          <div key={section.id}>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-baseline gap-2 text-base font-extrabold sm:text-lg">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-foreground/20 bg-highlight text-sm font-extrabold text-foreground">
                    {i + 1}
                  </span>
                  {section.title}
                </h3>
                <p className="mt-0.5 pl-9 text-xs text-muted">{section.blurb}</p>
              </div>
              <p className="shrink-0 text-lg font-extrabold tabular-nums text-accent">
                {section.score}
                <span className="text-sm font-semibold text-muted">/100</span>
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
              <div
                className={`h-full rounded-full ${barFill(section.score)}`}
                style={{ width: `${section.score}%` }}
              />
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4">
              {section.stats.map((stat) => (
                <CircularScore
                  key={stat.id}
                  score={stat.score}
                  label={stat.label}
                  hint={STAT_HINTS[stat.id as StatId]}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankSections({
  stats,
}: {
  stats: DiagnosisReport["stats"];
}) {
  const partA = buildPartASections(stats);
  const partB = buildPartBSections(stats);

  return (
    <div className="space-y-14">
      <RankBlock
        heading="Part A — Main Challenges"
        subheading="Primary scorecard. Overall score is the average of these 15. Strongest area first."
        sections={partA}
      />
      <RankBlock
        heading="Part B — Supporting diagnostics"
        subheading="Secondary signals that deepen the diagnosis. Not averaged into overall."
        sections={partB}
      />
    </div>
  );
}

function BalancedBlock({
  strengths,
  improvements,
  fallback,
}: {
  strengths?: string;
  improvements?: string;
  fallback?: string;
}) {
  if (strengths || improvements) {
    return (
      <div className="mt-5 space-y-4">
        {strengths ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              What went well
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
              {strengths}
            </p>
          </div>
        ) : null}
        {improvements ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
              What to improve
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
              {improvements}
            </p>
          </div>
        ) : null}
      </div>
    );
  }
  if (!fallback) return null;
  return (
    <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
      {fallback}
    </p>
  );
}

function SolveCtas() {
  return (
    <div className="card-surface border-border p-5 sm:p-7">
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-highlight px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-foreground">
        Next step
      </p>
      <h2 className="mt-3 text-xl font-extrabold sm:text-2xl">
        Want to solve your{" "}
        <span className="bg-highlight px-1 box-decoration-clone">speaking</span>?
      </h2>
      <p className="mt-2 text-sm text-muted">
        Book a diagnosis call with EliteSpeak — direct feedback that changes how
        you think and speak.
      </p>
      <a
        href={DIAGNOSIS_CALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-5 text-center no-underline"
      >
        Set Up a Diagnosis Call
      </a>
      <p className="mt-3 text-center text-xs text-muted">
        Free coaching diagnosis for practice — not a clinical assessment.
      </p>
    </div>
  );
}

export function DiagnosisPage({ report }: DiagnosisPageProps) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [leadError, setLeadError] = useState("");
  const [recipientName, setRecipientName] = useState("");

  useEffect(() => {
    const existing = readLead();
    if (existing?.name) {
      const first = existing.name.trim().split(/\s+/)[0];
      if (first) setRecipientName(first);
    }
    if (existing?.email) setEmail(existing.email);
    if (existing?.name) setFirstName(existing.name.split(/\s+/)[0] || "");
  }, []);

  const runDownload = async (name: string) => {
    setPdfBusy(true);
    setPdfNote("");
    try {
      await downloadReportPdf(report, { recipientName: name });
      setPdfNote("Report downloaded — personalized with your name.");
      setShowLeadForm(false);
    } catch {
      setPdfNote("Couldn’t download the PDF. Try again.");
    } finally {
      setPdfBusy(false);
    }
  };

  const onRequestPdf = () => {
    setLeadError("");
    setPdfNote("");
    if (recipientName) {
      void runDownload(recipientName);
      return;
    }
    setShowLeadForm(true);
  };

  const onLeadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLeadError("");
    const first = firstName.trim().split(/\s+/)[0];
    if (!first) {
      setLeadError("Enter your first name.");
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setLeadError(emailCheck.error);
      return;
    }

    setPdfBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: first,
          email: emailCheck.email,
          anonymousId: getOrCreateAnonymousId(),
          source: "pdf",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not save your details.");
      }
      setRecipientName(first);
      saveLead({
        name: first,
        email: emailCheck.email,
        source: "pdf",
        at: Date.now(),
      });
      await downloadReportPdf(report, { recipientName: first });
      setPdfNote("Report downloaded — personalized with your name.");
      setShowLeadForm(false);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10 animate-fade-up">
      <div className="mb-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-highlight px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          Your report
        </p>
        <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.22em] text-accent">
          EliteSpeak
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Your Communication{" "}
          <span className="bg-highlight px-1.5 box-decoration-clone">Report</span>
        </h1>
        <p className="mt-3 text-4xl font-extrabold tabular-nums">
          {Math.round(report.overallScore)}
          <span className="text-lg font-semibold text-muted"> / 100</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-accent">{report.level}</p>
        <div className="mt-5 flex max-w-md flex-col gap-3">
          <a
            href={DIAGNOSIS_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-center no-underline"
          >
            Set Up a Diagnosis Call
          </a>
          <button
            type="button"
            onClick={onRequestPdf}
            disabled={pdfBusy}
            className="btn-secondary"
          >
            {pdfBusy
              ? "Preparing PDF…"
              : recipientName
                ? "Download PDF report"
                : "Get my personalized PDF"}
          </button>
          {pdfNote ? (
            <p className="text-center text-xs text-muted">{pdfNote}</p>
          ) : null}
        </div>

        {showLeadForm ? (
          <form
            onSubmit={(e) => void onLeadSubmit(e)}
            className="card-surface mt-5 max-w-md space-y-3 p-4 text-left sm:p-5"
          >
            <p className="text-sm font-extrabold text-foreground">
              Enter your name &amp; email to download
            </p>
            <p className="text-xs text-muted">
              We&apos;ll put your name on the PDF so it feels personal.
            </p>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setLeadError("");
              }}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-accent"
              disabled={pdfBusy}
            />
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLeadError("");
              }}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-accent"
              disabled={pdfBusy}
            />
            {leadError ? (
              <p className="text-sm text-accent" role="alert">
                {leadError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pdfBusy}
              className="btn-highlight w-full uppercase tracking-[0.08em]"
            >
              {pdfBusy ? "Saving & preparing…" : "Download my PDF"}
            </button>
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => setShowLeadForm(false)}
              className="w-full text-center text-xs text-muted underline-offset-2 hover:underline"
            >
              Cancel
            </button>
          </form>
        ) : null}
      </div>

      <div className="card-surface p-5 sm:p-7">
        <h2 className="text-lg font-extrabold sm:text-xl">
          Your Main{" "}
          <span className="bg-highlight px-1 box-decoration-clone">Focus</span>
        </h2>
        <p className="mt-1 text-base font-bold text-accent">
          {report.mainChallenge.title}
        </p>
        <div className="mt-5">
          <ChallengeVisual imageKey={report.mainChallenge.imageKey} />
        </div>
        <BalancedBlock
          strengths={report.mainChallenge.strengths}
          improvements={report.mainChallenge.improvements}
          fallback={report.mainChallenge.summary}
        />
      </div>

      <div className="card-surface mt-5 p-5 sm:p-7">
        <RankSections stats={report.stats} />
      </div>

      <div className="mt-5">
        <SolveCtas />
      </div>

      <div className="card-surface mt-5 p-5 sm:p-7">
        <h2 className="text-lg font-extrabold">Secondary notes</h2>
        <p className="mt-1 text-xs text-muted">
          What else worked — and what to tighten next.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
          {report.minorChallenges}
        </p>
      </div>

      <div className="card-surface mt-5 border-highlight/80 bg-highlight/25 p-5 sm:p-7">
        <h2 className="text-lg font-extrabold">Your practice plan</h2>
        <p className="mt-1 text-xs text-muted">
          Keep what works. Drill what doesn&apos;t.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
          {report.solutionsCopy}
        </p>
      </div>

      <div className="mt-8">
        <SolveCtas />
      </div>

      <p className="mt-10 text-center text-xs text-muted">
        Free coaching diagnosis for practice — not a clinical assessment.
      </p>
    </section>
  );
}
