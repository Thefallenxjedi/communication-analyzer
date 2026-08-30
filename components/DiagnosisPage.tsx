"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { DiagnosisReport, DiagnosisStat, StatId } from "@/lib/schema";
import { STAT_HINTS } from "@/lib/schema";
import { buildPartASections, buildPartBSections, isHighPerformer } from "@/lib/scoring";
import { CommunicationProfileRadar } from "@/components/CommunicationProfileRadar";
import { ChallengeVisual } from "@/components/ChallengeVisual";
import { ReportSurvey } from "@/components/ReportSurvey";
import {
  ReportSectionNav,
  type ReportNavSection,
} from "@/components/ReportSectionNav";
import { ReportTestimonialBanner } from "@/components/ReportTestimonial";
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
  /** Public path like /r/abc123 — shown with copy control */
  sharePath?: string;
};

const LEVEL_META = [
  { name: "Needs Significant Improvement", min: 0, max: 37 },
  { name: "Inconsistent Communicator", min: 38, max: 51 },
  { name: "Developing Communicator", min: 52, max: 64 },
  { name: "Effective Communicator", min: 65, max: 77 },
  { name: "Strong Communicator", min: 78, max: 89 },
  { name: "Elite Communicator", min: 90, max: 100 },
] as const;

function levelIndexForScore(score: number): number {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (let i = LEVEL_META.length - 1; i >= 0; i--) {
    if (clamped >= LEVEL_META[i].min) return i;
  }
  return 0;
}

function levelBandLabel(min: number, max: number): string {
  if (min <= 0) return `0–${max}`;
  if (max >= 100) return `${min}+`;
  return `${min}–${max}`;
}

function scoreStroke(score100: number): string {
  if (score100 >= 70) return "stroke-emerald-700";
  if (score100 >= 50) return "stroke-[#111111]";
  return "stroke-accent";
}

function cleanPhrase(raw: string): string {
  return raw
    .replace(/^["“'`]+|["”'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceLines(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\n+| \| /)
    .map((s) => cleanPhrase(s))
    .filter((s) => s.length >= 2)
    .slice(0, 5);
}

type HighlightSpan = { text: string; focus: boolean; tagLabel: string | null };

function findFocusHits(
  sentence: string,
  focusQuotes: string[],
): Array<{ start: number; end: number }> {
  const lower = sentence.toLowerCase();
  const hits: Array<{ start: number; end: number }> = [];
  for (const q of focusQuotes) {
    const needle = q.toLowerCase().trim();
    if (needle.length < 2) continue;
    let from = 0;
    let found = false;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      hits.push({ start: idx, end: idx + needle.length });
      found = true;
      from = idx + needle.length;
    }
    if (!found) {
      const words = needle.split(/\s+/).filter(Boolean);
      if (words.length >= 3) {
        const soft = words.slice(0, 3).join(" ");
        const idx = lower.indexOf(soft);
        if (idx >= 0) hits.push({ start: idx, end: idx + soft.length });
      }
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: typeof hits = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    merged.push(hit);
    cursor = hit.end;
  }
  return merged;
}

/** Main-focus quote hits win; filler/hedging tags fill the rest. */
function buildTranscriptSpans(
  sentence: string,
  focusQuotes: string[],
): HighlightSpan[] {
  const focusHits = findFocusHits(sentence, focusQuotes);
  const meta: Array<{ focus: boolean; tagLabel: string | null }> = Array.from(
    sentence,
    () => ({ focus: false, tagLabel: null }),
  );

  let pos = 0;
  for (const span of tagSentence(sentence).spans) {
    for (let k = 0; k < span.text.length; k++) {
      const at = pos + k;
      if (at < meta.length) {
        meta[at] = { focus: false, tagLabel: span.tag?.label ?? null };
      }
    }
    pos += span.text.length;
  }
  for (const h of focusHits) {
    for (let i = h.start; i < h.end && i < meta.length; i++) {
      meta[i] = { focus: true, tagLabel: null };
    }
  }

  const out: HighlightSpan[] = [];
  let i = 0;
  while (i < sentence.length) {
    const cur = meta[i] || { focus: false, tagLabel: null };
    let j = i + 1;
    while (
      j < sentence.length &&
      meta[j]?.focus === cur.focus &&
      meta[j]?.tagLabel === cur.tagLabel
    ) {
      j++;
    }
    out.push({
      text: sentence.slice(i, j),
      focus: cur.focus,
      tagLabel: cur.tagLabel,
    });
    i = j;
  }
  return out.length ? out : [{ text: sentence, focus: false, tagLabel: null }];
}

function TranscriptReview({
  report,
  focusQuotes,
  challengeLabel,
  anchorId = "report-transcript",
}: {
  report: DiagnosisReport;
  focusQuotes: string[];
  challengeLabel: string;
  anchorId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const transcript = report.transcript?.trim();
  if (!transcript) return null;

  const sentences = splitTranscriptSentences(transcript).map((text) => {
    const spans = buildTranscriptSpans(text, focusQuotes);
    return {
      text,
      spans,
      hasFocus: spans.some((s) => s.focus),
    };
  });
  const hasFocus = sentences.some((s) => s.hasFocus);
  const hasTags = sentences.some((s) =>
    s.spans.some((span) => Boolean(span.tagLabel)),
  );
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const isLong =
    transcript.length > 520 || sentences.length > 7 || wordCount > 90;
  const showBody = !isLong || expanded;
  const preview = transcript.slice(0, 220).trim();
  const sourceLabel = report.transcriptOnly
    ? "YouTube captions"
    : "From your recording";

  const renderSentences = (lines: typeof sentences) => (
    <div className="space-y-3">
      {lines.map((line, i) => (
        <div
          key={`${i}-${line.text.slice(0, 24)}`}
          className={
            line.hasFocus
              ? "rounded-md border border-accent/25 bg-accent-soft/40 px-3 py-2.5"
              : line.spans.some((s) => s.tagLabel)
                ? "rounded-md border border-border bg-[#fafafa] px-3 py-2"
                : "px-3 py-2"
          }
        >
          {line.hasFocus ? (
            <p className="mb-2 inline-flex items-center rounded bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
              Flagged · {challengeLabel}
            </p>
          ) : null}
          <p
            className={`text-sm leading-relaxed sm:text-base ${
              line.hasFocus ? "text-foreground/55" : ""
            }`}
          >
            {line.spans.map((span, j) =>
              span.focus ? (
                <mark
                  key={`${i}-${j}`}
                  className="mx-0.5 inline rounded-sm border-b-2 border-accent bg-accent-soft px-1 py-0.5 font-extrabold not-italic text-foreground"
                >
                  {span.text}
                </mark>
              ) : span.tagLabel ? (
                <mark
                  key={`${i}-${j}`}
                  className="rounded-sm bg-[#f3f4f6] px-0.5 font-semibold not-italic text-foreground underline decoration-accent/40 decoration-2 underline-offset-2"
                  title={span.tagLabel}
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
  );

  return (
    <div
      id={anchorId}
      className="scroll-mt-24 rounded-2xl border border-border bg-card"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <StoryHeading>Your words</StoryHeading>
          <p className="mt-1 text-xs font-medium text-muted">
            {sourceLabel}
            {wordCount > 0 ? ` · ${wordCount.toLocaleString()} words` : ""}
          </p>
          {showBody ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {hasFocus
                ? `Soft red highlights = what we flagged for ${challengeLabel}.`
                : hasTags
                  ? "Highlighted words map to a criterion from your scorecard."
                  : "Full transcript used for your diagnosis."}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Long transcript — expand only if you want to read every line.
            </p>
          )}
        </div>
        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-full border border-border bg-track/80 px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-accent/40 hover:bg-accent-soft"
            aria-expanded={expanded}
          >
            {expanded ? "Hide transcript" : "Show full transcript"}
          </button>
        ) : null}
      </div>

      <div className="px-4 py-4 sm:px-5">
        {focusQuotes.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {focusQuotes.map((q) => (
              <span
                key={q}
                className="max-w-full rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1.5 text-xs font-bold leading-snug text-foreground"
              >
                “{q}”
              </span>
            ))}
          </div>
        ) : null}

        {!showBody ? (
          <p className="text-sm leading-relaxed text-muted/90">
            {preview}
            {transcript.length > preview.length ? "…" : ""}
          </p>
        ) : (
          <div
            className={
              isLong && expanded
                ? "max-h-[min(22rem,50vh)] overflow-y-auto pr-1"
                : undefined
            }
          >
            {renderSentences(sentences)}
          </div>
        )}
      </div>
    </div>
  );
}

function StoryHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
      {children}
    </h2>
  );
}

function InsightCard({
  title,
  children,
  variant = "default",
  badge,
}: {
  title: string;
  children: ReactNode;
  variant?: "default" | "quote" | "warning" | "positive";
  badge?: string;
}) {
  const shell =
    variant === "quote"
      ? "border-foreground/12 bg-gradient-to-br from-track/55 to-card"
      : variant === "warning"
        ? "border-accent/25 bg-accent-soft/45"
        : variant === "positive"
          ? "border-emerald-600/20 bg-emerald-50/90"
          : "border-border bg-card";

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ring-1 ring-black/[0.04] ${shell}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
          {title}
        </p>
        {badge ? (
          <span className="rounded-full border border-accent/30 bg-white/70 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function ScoreSummaryBlock({
  overall,
  level,
  topPercent,
}: {
  overall: number;
  level: string;
  topPercent?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-4xl font-extrabold tabular-nums sm:text-5xl">
            {overall}
          </p>
          <p className="text-sm font-semibold text-muted">out of 100</p>
          <p className="mt-2 text-base font-extrabold sm:text-lg">{level}</p>
        </div>
        <div className="sm:max-w-xs sm:flex-1">
          <LevelLadder level={level} overall={overall} />
        </div>
      </div>
      {typeof topPercent === "number" ? (
        <TopPercentMeter topPercent={topPercent} />
      ) : null}
    </div>
  );
}

function LevelLadder({ level, overall }: { level: string; overall: number }) {
  const byName = LEVEL_META.findIndex(
    (row) => row.name.toLowerCase() === level.trim().toLowerCase(),
  );
  const active = byName >= 0 ? byName : levelIndexForScore(overall);

  return (
    <div>
      <div className="mb-3 h-1.5 w-full rounded-full bg-track">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, overall))}%` }}
        />
      </div>
      <ol className="w-full space-y-2">
        {LEVEL_META.map((row, i) => {
          const on = i === active;
          return (
            <li
              key={row.name}
              className={`rounded-lg px-2 py-1.5 ${
                on ? "bg-accent-soft/70 ring-1 ring-accent/25" : ""
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs sm:text-sm ${
                  on ? "font-extrabold text-foreground" : "text-muted"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    on ? "bg-accent" : "bg-track"
                  }`}
                />
                <span className="min-w-0 flex-1 leading-snug">{row.name}</span>
                <span className="shrink-0 tabular-nums text-[10px] font-bold uppercase tracking-wide">
                  {levelBandLabel(row.min, row.max)}
                </span>
              </div>
              {on ? (
                <p className="mt-1 pl-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent">
                  You are here
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** topPercent = share who scored higher. Beat % = how many you outscored. */
function beatPercentFromTop(topPercent: number): number {
  const top = Math.max(1, Math.min(99, Math.round(topPercent)));
  return Math.max(1, Math.min(99, 100 - top));
}

/** Visual rank meter: fill grows left → right to “you outscored X%”. */
function TopPercentMeter({ topPercent }: { topPercent: number }) {
  const beatPct = beatPercentFromTop(topPercent);
  const leftPct = Math.max(8, Math.min(92, beatPct));
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setPlay(true));
    return () => window.cancelAnimationFrame(id);
  }, [beatPct]);

  const shown = play ? leftPct : 0;

  return (
    <div className="mt-6 w-full">
      <p className="text-sm font-extrabold text-accent">
        You outscored {beatPct}%{" "}
        <span className="font-semibold text-muted">of communicators</span>
      </p>

      <div className="mt-4">
        <div className="relative h-7">
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-1000 ease-out"
            style={{ left: `${shown}%` }}
          >
            <span className="text-[11px] font-extrabold leading-none text-accent">
              You
            </span>
            <span
              className="mt-1 block"
              aria-hidden
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "6px solid var(--accent)",
              }}
            />
          </div>
        </div>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-track">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-1000 ease-out"
            style={{ width: `${shown}%` }}
          />
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-sm transition-[left] duration-1000 ease-out"
            style={{ left: `${shown}%` }}
            aria-hidden
          />
        </div>

        <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span>Lower</span>
          <span>Higher</span>
        </div>
      </div>
    </div>
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
        <p className="mt-2 w-full rounded-md border border-accent/25 bg-accent-soft px-2 py-1.5 text-left text-[11px] font-bold leading-snug text-foreground not-italic">
          <span className="mb-0.5 block text-[9px] font-extrabold uppercase tracking-wide text-accent">
            From your words
          </span>
          “{example.replace(/^["“]|["”]$/g, "")}”
        </p>
      ) : null}
    </li>
  );
}

function pickTopGaps(stats: DiagnosisStat[], count = 3): DiagnosisStat[] {
  return [...stats].sort((a, b) => a.score - b.score).slice(0, count);
}

function TopGapsCard({ stats }: { stats: DiagnosisStat[] }) {
  const gaps = pickTopGaps(stats, 3);
  if (gaps.length === 0) return null;

  return (
    <div id="report-gaps" className="scroll-mt-24 mt-10">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        Start here
      </p>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
        Your 3 biggest gaps
      </h2>
      <p className="mt-2 text-sm text-muted">
        Lowest scores from your clip — full breakdown with 29 skills below.
      </p>
      <ul className="mt-4 space-y-3">
        {gaps.map((stat, index) => {
          const hint = STAT_HINTS[stat.id as StatId];
          const example = stat.example?.trim();
          return (
            <li
              key={stat.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-black/[0.04]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                    Gap {index + 1}
                  </p>
                  <p className="mt-1 text-base font-extrabold text-foreground">
                    {stat.label}
                  </p>
                  {hint ? (
                    <p className="mt-1 text-sm text-muted">{hint}</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-2xl font-extrabold tabular-nums text-accent">
                  {Math.round(stat.score)}
                </p>
              </div>
              {example ? (
                <p className="mt-3 rounded-xl border border-accent/20 bg-accent-soft/50 px-3 py-2 text-sm font-semibold leading-relaxed text-foreground">
                  “{example.replace(/^["“]|["”]$/g, "")}”
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProfileDepthTeaser({ onJump }: { onJump: () => void }) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-border bg-track/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-relaxed text-muted">
        <span className="font-extrabold text-foreground">Still in your report:</span>
        {" "}
        15 main skills · 14 supporting skills · quoted examples · practice plan in
        your PDF
      </p>
      <button
        type="button"
        onClick={onJump}
        className="shrink-0 text-sm font-extrabold text-accent hover:underline"
      >
        See full breakdown ↓
      </button>
    </div>
  );
}

function RankBlock({
  heading,
  sections,
  sectionId,
}: {
  heading: string;
  sections: ReturnType<typeof buildPartASections>;
  sectionId?: string;
}) {
  return (
    <div id={sectionId} className={sectionId ? "scroll-mt-24" : undefined}>
      <h2 className="border-b border-foreground pb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-10 space-y-14">
        {sections.map((section, index) => (
          <div
            key={section.id}
            id={`profile-${section.id}`}
            className="scroll-mt-24"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Section {index + 1} of {sections.length}
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {section.title}
              </h3>
              <p className="shrink-0 text-lg font-extrabold tabular-nums">
                {section.score}/100
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

export function DiagnosisPage({
  report,
  onHome,
  sharePath,
}: DiagnosisPageProps) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [leadError, setLeadError] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
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
  const highPerformer = isHighPerformer(overall);
  const focusGeneric = report.mainChallenge.imageKey === "generic";
  const challenge = report.mainChallenge.title.trim() || "Clarity";
  const noticed =
    report.mainChallenge.summary?.trim() ||
    (highPerformer && focusGeneric
      ? report.mainChallenge.strengths?.trim()
      : report.mainChallenge.improvements?.trim()) ||
    "";
  const quotes = evidenceLines(report.mainChallenge.evidence);
  const profileOpts = { transcriptOnly: Boolean(report.transcriptOnly) };
  const partA = buildPartASections(report.stats, profileOpts);
  const partB = buildPartBSections(report.stats, profileOpts);

  const shareUrl = sharePath
    ? `https://app.elitespeakprogram.com${sharePath}`
    : "";

  const copyShareLink = () => {
    if (!shareUrl) return;
    void navigator.clipboard?.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const reportSlugForSurvey = sharePath?.startsWith("/r/")
    ? sharePath.slice(3).split(/[/?#]/)[0]
    : undefined;

  const jumpToMainSkills = () => {
    document
      .getElementById("report-main-skills")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navSections: ReportNavSection[] = [
    { id: "report-score", label: "Score & diagnosis" },
    { id: "report-gaps", label: "Start here (3 gaps)" },
  ];
  if (report.transcript?.trim()) {
    navSections.push({ id: "report-transcript", label: "Your words" });
  }
  navSections.push(
    { id: "report-profile", label: "Four areas" },
    { id: "report-main-skills", label: "Main skills (15)" },
    { id: "report-support-skills", label: "Supporting (14)" },
    { id: "report-next", label: "What's next" },
  );

  return (
    <>
    <ReportSectionNav sections={navSections} />
    <section className="mx-auto w-full max-w-2xl px-4 pb-24 pt-2 animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onHome}
          className="text-sm font-semibold text-accent hover:underline"
        >
          ← EliteSpeak Home
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {sharePath ? (
            <button
              type="button"
              onClick={copyShareLink}
              title={shareUrl}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:bg-accent-soft"
            >
              {linkCopied ? "Link copied" : "Copy report link"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRequestPdf}
            disabled={pdfBusy}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted transition hover:border-foreground/20 hover:text-foreground disabled:opacity-55"
          >
            {pdfBusy ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
      </div>
      {sharePath ? (
        <p className="mb-6 text-xs text-muted">
          Save or share this page — your report stays here when you return.
        </p>
      ) : null}
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

      <div id="report-score" className="scroll-mt-24">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        Your results
        {report.transcriptOnly ? (
          <span className="ml-2 normal-case tracking-normal text-muted/80">
            · Transcript only (beta)
          </span>
        ) : null}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {highPerformer && focusGeneric ? (
          <>
            You communicated{" "}
            <span className="bg-highlight px-1.5 box-decoration-clone">
              strongly.
            </span>
          </>
        ) : (
          <>
            Your main challenge is{" "}
            <span className="bg-highlight px-1.5 box-decoration-clone">
              {challenge.replace(/\.$/, "")}.
            </span>
          </>
        )}
      </h1>

      {!focusGeneric || !highPerformer ? (
        <div className="mt-6">
          <ChallengeVisual imageKey={report.mainChallenge.imageKey} />
        </div>
      ) : null}

      <div className={!focusGeneric || !highPerformer ? "mt-8" : "mt-6"}>
        <ScoreSummaryBlock
          overall={overall}
          level={report.level}
          topPercent={report.scoreTopPercent}
        />
      </div>

      {report.comesAcross?.trim() ||
      noticed ||
      report.mainChallenge.mechanism?.trim() ||
      (quotes.length > 0 && !(highPerformer && focusGeneric)) ||
      (report.mainChallenge.whyItMatters?.trim() &&
        !(highPerformer && focusGeneric)) ||
      (report.mainChallenge.upside?.trim() && !(highPerformer && focusGeneric))
        ? (
        <div className="mt-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            Your diagnosis
          </p>
          <div className="mt-4 space-y-4">
            {report.comesAcross?.trim() ? (
              <InsightCard title="How you sound to others" variant="quote">
                <p className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {report.comesAcross}
                </p>
              </InsightCard>
            ) : null}

            {noticed ? (
              <InsightCard
                title={
                  highPerformer && focusGeneric
                    ? "What's already strong"
                    : "Your biggest habit"
                }
                badge={
                  highPerformer && focusGeneric
                    ? undefined
                    : challenge.replace(/\.$/, "")
                }
              >
                <p className="text-base leading-relaxed text-foreground/90">
                  {noticed}
                </p>
              </InsightCard>
            ) : null}

            {report.mainChallenge.mechanism?.trim() ? (
              <InsightCard title="Why this happens">
                <p className="text-base leading-relaxed text-foreground/90">
                  {report.mainChallenge.mechanism}
                </p>
              </InsightCard>
            ) : null}

            {quotes.length > 0 && !(highPerformer && focusGeneric) ? (
              <InsightCard
                title="From your clip"
                badge={challenge.replace(/\.$/, "")}
              >
                <p className="text-sm text-muted">
                  Exact phrases we flagged. Same spots are marked in Your words
                  next.
                </p>
                <ul className="mt-3 space-y-2">
                  {quotes.map((q) => (
                    <li
                      key={q}
                      className="rounded-xl border border-accent/20 bg-white/70 px-3 py-2.5 text-sm font-semibold leading-relaxed text-foreground"
                    >
                      “{q}”
                    </li>
                  ))}
                </ul>
              </InsightCard>
            ) : null}

            {!(highPerformer && focusGeneric) &&
            (report.mainChallenge.whyItMatters?.trim() ||
              report.mainChallenge.upside?.trim()) ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {report.mainChallenge.whyItMatters?.trim() ? (
                  <InsightCard title="Why this costs you" variant="warning">
                    <p className="text-base leading-relaxed text-foreground/90">
                      {report.mainChallenge.whyItMatters}
                    </p>
                  </InsightCard>
                ) : null}
                {report.mainChallenge.upside?.trim() ? (
                  <InsightCard title="If you fix this" variant="positive">
                    <p className="text-base leading-relaxed text-foreground/90">
                      {report.mainChallenge.upside}
                    </p>
                  </InsightCard>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>

      <TopGapsCard stats={report.stats} />

      <TranscriptReview
        report={report}
        focusQuotes={quotes}
        challengeLabel={challenge}
      />

      <div id="report-testimonial-mid" className="scroll-mt-24 mt-10">
        <ReportTestimonialBanner
          src="/testimonials/vipul.png"
          alt="Vipul Gidda — EliteSpeak testimonial"
        />
      </div>

      <div className="mt-14 space-y-8">
        <StoryHeading>
          {highPerformer && focusGeneric
            ? "What stood out"
            : `Your ${challenge.replace(/\.$/, "")} patterns`}
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
        {report.mainChallenge.improvements &&
        !(highPerformer && focusGeneric) ? (
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

      <div id="report-profile" className="scroll-mt-24 mt-12">
        <CommunicationProfileRadar
          sections={partA}
          focusImageKey={report.mainChallenge.imageKey}
          overallScore={overall}
          onSelectSection={(sectionId) => {
            document
              .getElementById(`profile-${sectionId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
        <ProfileDepthTeaser onJump={jumpToMainSkills} />
      </div>

      <div className="mt-16 space-y-16">
        <RankBlock
          heading="Main challenges"
          sections={partA}
          sectionId="report-main-skills"
        />
        <RankBlock
          heading="Supporting diagnostics"
          sections={partB}
          sectionId="report-support-skills"
        />
      </div>

      {report.minorChallenges?.trim() ? (
        <div className="mt-16">
          <StoryHeading>Secondary notes</StoryHeading>
          <p className="mt-3 text-base leading-relaxed text-foreground/90">
            {report.minorChallenges}
          </p>
        </div>
      ) : null}

      <div id="report-testimonial-end" className="scroll-mt-24 mt-16">
        <ReportTestimonialBanner
          src="/testimonials/cordell.png"
          alt="Cordell Jeffers — EliteSpeak testimonial"
        />
      </div>

      <div
        id="report-next"
        className="scroll-mt-24 mt-16 border border-border p-5 sm:p-7"
      >
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

    <ReportSurvey reportSlug={reportSlugForSurvey} />
    </>
  );
}
