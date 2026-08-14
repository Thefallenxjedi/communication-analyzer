"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { DiagnosisReport, DiagnosisStat, StatId } from "@/lib/schema";
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
import {
  splitTranscriptSentences,
  tagSentence,
} from "@/lib/transcript-tags";

type DiagnosisPageProps = {
  report: DiagnosisReport;
  onHome: () => void;
};

const LEVELS = [
  "Needs Significant Improvement",
  "Inconsistent Communicator",
  "Developing Communicator",
  "Effective Communicator",
  "Strong Communicator",
  "Elite Communicator",
] as const;

function scoreStroke(score100: number): string {
  if (score100 >= 70) return "stroke-emerald-700";
  if (score100 >= 50) return "stroke-[#111111]";
  return "stroke-accent";
}

function evidenceLines(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\n+|(?<=[.?!])\s+(?=["“])/)
    .map((s) => cleanPhrase(s))
    .filter(Boolean);
}

function cleanPhrase(raw: string): string {
  return raw
    .replace(/^["“'`]+|["”'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function StoryHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
      {children}
    </h2>
  );
}

function LevelLadder({ level }: { level: string }) {
  const current = LEVELS.findIndex(
    (name) => name.toLowerCase() === level.trim().toLowerCase(),
  );
  const active = current >= 0 ? current : 2;

  return (
    <ol className="w-full space-y-1.5">
      {LEVELS.map((name, i) => {
        const on = i === active;
        return (
          <li
            key={name}
            className={`flex items-center gap-2 text-xs sm:text-sm ${
              on ? "font-extrabold text-foreground" : "text-muted"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                on ? "bg-accent" : "bg-track"
              }`}
            />
            {name}
          </li>
        );
      })}
    </ol>
  );
}

function CircularMarker({ stat }: { stat: DiagnosisStat }) {
  const hint = STAT_HINTS[stat.id as StatId];
  const example = stat.example?.trim();
  const size = 72;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(stat.score)));
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
      <p className="mt-2 w-full text-[11px] font-extrabold leading-snug text-foreground sm:text-xs">
        {stat.label}
      </p>
      {hint ? (
        <p className="mt-1 w-full text-[10px] leading-snug text-muted sm:text-[11px]">
          {hint}
        </p>
      ) : null}
      {example ? (
        <p className="mt-1.5 w-full text-[11px] italic leading-snug text-foreground/80">
          “{example.replace(/^["“]|["”]$/g, "")}”
        </p>
      ) : null}
    </li>
  );
}

function RankBlock({
  heading,
  sections,
}: {
  heading: string;
  sections: ReturnType<typeof buildPartASections>;
}) {
  return (
    <div>
      <h2 className="border-b border-foreground pb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-10 space-y-14">
        {sections.map((section, index) => (
          <div key={section.id}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Section {index + 1} of {sections.length}
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {section.title}
              </h3>
              <p className="shrink-0 text-lg font-extrabold tabular-nums">
                {section.score}
                <span className="text-sm font-semibold text-muted">/100</span>
              </p>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
              {section.stats.map((stat) => (
                <CircularMarker key={stat.id} stat={stat} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function TranscriptReview({ report }: { report: DiagnosisReport }) {
  const transcript = report.transcript?.trim();
  if (!transcript) return null;

  const sentences = splitTranscriptSentences(transcript).map((text) => ({
    text,
    ...tagSentence(text),
  }));
  const hasTags = sentences.some((s) => s.tags.length > 0);

  return (
    <div className="mt-14">
      <StoryHeading>Your words</StoryHeading>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {hasTags
          ? "Highlighted words map to a criterion from your scorecard. This is from your transcript, not a second analysis."
          : "This is the transcript from your recording."}
      </p>
      <div className="mt-5 space-y-3">
        {sentences.map((line, i) => (
          <div
            key={`${i}-${line.text.slice(0, 24)}`}
            className={
              line.tags.length
                ? "border-l-2 border-accent bg-[#fff4f3] px-3 py-2"
                : "px-3 py-2"
            }
          >
            {line.tags.length ? (
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-accent">
                {line.tags.map((t) => t.label).join(" · ")}
              </p>
            ) : null}
            <p className="text-sm leading-relaxed sm:text-base">
              {line.spans.map((span, j) =>
                span.tag ? (
                  <mark
                    key={`${i}-${j}`}
                    className="rounded-sm bg-highlight/70 px-0.5 font-semibold not-italic"
                    title={span.tag.label}
                  >
                    {span.text}
                  </mark>
                ) : (
                  <span key={`${i}-${j}`}>{span.text}</span>
                ),
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiagnosisPage({ report, onHome }: DiagnosisPageProps) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [leadError, setLeadError] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const autoDownloadRef = useRef(false);

  const runDownload = async (name: string) => {
    setPdfBusy(true);
    setPdfNote("");
    try {
      await downloadReportPdf(report, { recipientName: name });
      setPdfNote("Report downloaded with your name.");
      setShowLeadForm(false);
    } catch {
      setPdfNote("Couldn’t download the PDF. Try again.");
    } finally {
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const existing = readLead();
    let first = "";
    if (existing?.name) {
      first = existing.name.trim().split(/\s+/)[0] || "";
      if (first) {
        setRecipientName(first);
        setFirstName(first);
      }
    }
    if (existing?.email) setEmail(existing.email);

    if (!first || autoDownloadRef.current) return;
    autoDownloadRef.current = true;

    const autoKey = `ca_pdf_auto_${Math.round(report.overallScore)}_${(report.level || "").slice(0, 40)}`;
    try {
      if (sessionStorage.getItem(autoKey)) return;
      sessionStorage.setItem(autoKey, "1");
    } catch {
      // private mode: still attempt once via ref
    }
    void runDownload(first);
    // Auto-download once when the report page mounts with a known lead name.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only
  }, []);

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
      setPdfNote("Report downloaded with your name.");
      setShowLeadForm(false);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPdfBusy(false);
    }
  };

  const overall = Math.round(report.overallScore);
  const challenge = report.mainChallenge.title.trim() || "Clarity";
  const noticed =
    report.mainChallenge.summary?.trim() ||
    report.mainChallenge.improvements?.trim() ||
    "";
  const quotes = evidenceLines(report.mainChallenge.evidence);
  const partA = buildPartASections(report.stats);
  const partB = buildPartBSections(report.stats);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-24 pt-2 animate-fade-up">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onHome}
          className="text-sm font-semibold text-accent hover:underline"
        >
          ← EliteSpeak Home
        </button>
        <button
          type="button"
          onClick={onRequestPdf}
          disabled={pdfBusy}
          className="text-sm font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          {pdfBusy ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
      {pdfNote ? (
        <p className="mb-4 text-right text-xs text-muted">{pdfNote}</p>
      ) : null}

      {showLeadForm ? (
        <form
          onSubmit={(e) => void onLeadSubmit(e)}
          className="mb-8 space-y-3 border border-border p-4 text-left"
        >
          <p className="text-sm font-extrabold">Name and email to download</p>
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
            className="btn-primary w-full"
          >
            {pdfBusy ? "Saving…" : "Download my PDF"}
          </button>
        </form>
      ) : null}

      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        Your results
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Your main challenge is{" "}
        <span className="bg-highlight px-1.5 box-decoration-clone">
          {challenge.replace(/\.$/, "")}.
        </span>
      </h1>

      <div className="mt-6">
        <ChallengeVisual imageKey={report.mainChallenge.imageKey} />
      </div>

      {noticed ? (
        <div className="mt-10">
          <StoryHeading>What you noticed</StoryHeading>
          <p className="mt-2 text-base leading-relaxed text-foreground/90">
            {noticed}
          </p>
        </div>
      ) : null}

      {report.comesAcross?.trim() ? (
        <div className="mt-10">
          <StoryHeading>How your communication comes across</StoryHeading>
          <p className="mt-2 text-base leading-relaxed text-foreground/90">
            {report.comesAcross}
          </p>
        </div>
      ) : report.mainChallenge.mechanism?.trim() ? (
        <div className="mt-10">
          <StoryHeading>What is happening</StoryHeading>
          <p className="mt-2 text-base leading-relaxed text-foreground/90">
            {report.mainChallenge.mechanism}
          </p>
        </div>
      ) : null}

      {report.mainChallenge.mechanism?.trim() && report.comesAcross?.trim() ? (
        <div className="mt-10">
          <StoryHeading>What is happening</StoryHeading>
          <p className="mt-2 text-base leading-relaxed text-foreground/90">
            {report.mainChallenge.mechanism}
          </p>
        </div>
      ) : null}

      {quotes.length > 0 ? (
        <div className="mt-10">
          <StoryHeading>Evidence</StoryHeading>
          <ul className="mt-3 space-y-3">
            {quotes.map((q) => (
              <li
                key={q}
                className="border-l-2 border-foreground/20 pl-3 text-base italic leading-relaxed text-foreground/85"
              >
                “{q}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.mainChallenge.whyItMatters?.trim() ? (
        <div className="mt-10">
          <StoryHeading>Why it matters</StoryHeading>
          <p className="mt-2 text-base leading-relaxed text-foreground/90">
            {report.mainChallenge.whyItMatters}
          </p>
        </div>
      ) : null}

      {report.mainChallenge.upside?.trim() ? (
        <div className="mt-10">
          <StoryHeading>What changes when this improves</StoryHeading>
          <p className="mt-2 text-base leading-relaxed text-foreground/90">
            {report.mainChallenge.upside}
          </p>
        </div>
      ) : null}

      <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="text-center sm:text-left">
          <p className="text-4xl font-extrabold tabular-nums">{overall}</p>
          <p className="text-sm font-semibold text-muted">out of 100</p>
          <p className="mt-2 text-base font-extrabold">{report.level}</p>
        </div>
        <LevelLadder level={report.level} />
      </div>

      <a
        href={DIAGNOSIS_CALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-8 text-center no-underline"
      >
        Speak to a coach about your results
      </a>

      <div className="mt-14 space-y-8">
        <StoryHeading>
          {`Your ${challenge.replace(/\.$/, "")} patterns`}
        </StoryHeading>
        {report.mainChallenge.strengths ? (
          <div>
            <h3 className="text-base font-extrabold text-emerald-700">
              What went well
            </h3>
            <p className="mt-2 text-base leading-relaxed text-foreground/90">
              {report.mainChallenge.strengths}
            </p>
          </div>
        ) : null}
        {report.mainChallenge.improvements ? (
          <div>
            <h3 className="text-base font-extrabold text-accent">
              What to improve
            </h3>
            <p className="mt-2 text-base leading-relaxed text-foreground/90">
              {report.mainChallenge.improvements}
            </p>
          </div>
        ) : null}
      </div>

      <TranscriptReview report={report} />

      <div className="mt-16 space-y-16">
        <RankBlock heading="Main challenges" sections={partA} />
        <RankBlock heading="Supporting diagnostics" sections={partB} />
      </div>

      {report.minorChallenges?.trim() ? (
        <div className="mt-16">
          <StoryHeading>Secondary notes</StoryHeading>
          <p className="mt-3 text-base leading-relaxed text-foreground/90">
            {report.minorChallenges}
          </p>
        </div>
      ) : null}

      <div className="mt-16 border border-border p-5 sm:p-7">
        <StoryHeading>What&apos;s next</StoryHeading>
        <h3 className="mt-3 text-lg font-extrabold sm:text-xl">
          Want a coach, or want to work it yourself?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">
          Book a diagnosis call with an EliteSpeak coach to get feedback and put a
          plan together. If you want more solutions on your own, download the PDF.
          It includes your practice plan so you can start today.
        </p>
        <a
          href={DIAGNOSIS_CALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-5 text-center no-underline"
        >
          Speak with a coach
        </a>
        <button
          type="button"
          onClick={onRequestPdf}
          disabled={pdfBusy}
          className="mt-3 w-full text-center text-sm font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          Download PDF with your practice plan
        </button>
      </div>

      <p className="mt-10 text-center text-xs text-muted">
        Free coaching diagnosis for practice. Not a clinical assessment.
      </p>
    </section>
  );
}
