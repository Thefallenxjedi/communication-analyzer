"use client";

import type { DiagnosisReport, DiagnosisStat, StatId } from "@/lib/schema";
import { STAT_HINTS } from "@/lib/schema";
import { buildStatSections } from "@/lib/scoring";
import { ChallengeVisual } from "@/components/ChallengeVisual";

/** Placeholder outbound links — replace when you have real URLs */
export const THOUGHTS2WORDS_URL =
  process.env.NEXT_PUBLIC_THOUGHTS2WORDS_URL || "https://thoughts2words.com";
export const COACH_URL =
  process.env.NEXT_PUBLIC_COACH_URL || "https://calendly.com";

type DiagnosisPageProps = {
  report: DiagnosisReport;
};

function scoreTone(score: number): {
  fill: string;
  text: string;
  star: string;
  border: string;
  bg: string;
} {
  if (score >= 7) {
    return {
      fill: "bg-accent",
      text: "text-accent",
      star: "text-accent",
      border: "border-accent/25",
      bg: "bg-accent-soft/60",
    };
  }
  if (score >= 5) {
    return {
      fill: "bg-amber-500",
      text: "text-amber-700",
      star: "text-amber-500",
      border: "border-amber-200",
      bg: "bg-amber-50",
    };
  }
  return {
    fill: "bg-rose-500",
    text: "text-rose-700",
    star: "text-rose-400",
    border: "border-rose-200",
    bg: "bg-rose-50",
  };
}

function sectionTone(score100: number) {
  return scoreTone(Math.round(score100 / 10));
}

function StarRow({ score }: { score: number }) {
  const tone = scoreTone(score);
  const filled = score / 2;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${score} out of 10`}>
      {Array.from({ length: 5 }, (_, i) => {
        const portion = Math.min(1, Math.max(0, filled - i));
        return (
          <span key={i} className="relative inline-block h-4 w-4">
            <svg
              viewBox="0 0 24 24"
              className="absolute inset-0 h-4 w-4 text-track"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>
            <span
              className={`absolute inset-0 overflow-hidden ${tone.star}`}
              style={{ width: `${portion * 100}%` }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                />
              </svg>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function StatCard({ stat }: { stat: DiagnosisStat }) {
  const tone = scoreTone(stat.score);
  const hint =
    STAT_HINTS[stat.id as StatId] ||
    "How this part of your communication shows up.";

  return (
    <li
      className={`w-[9.5rem] shrink-0 snap-start rounded-2xl border ${tone.border} ${tone.bg} p-3.5 sm:p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-extrabold leading-snug">{stat.label}</p>
        <span className={`text-sm font-extrabold tabular-nums ${tone.text}`}>
          {stat.score}
        </span>
      </div>
      <div className="mt-2">
        <StarRow score={stat.score} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{hint}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
        <div
          className={`h-full rounded-full ${tone.fill}`}
          style={{ width: `${stat.score * 10}%` }}
        />
      </div>
    </li>
  );
}

function RankSections({ stats }: { stats: DiagnosisStat[] }) {
  const sections = buildStatSections(stats);

  return (
    <div>
      <h2 className="text-lg font-extrabold sm:text-xl">Where you rank</h2>
      <p className="mt-1 text-sm text-muted">
        Four skill areas with section scores. Swipe each row for every marker.
      </p>

      <div className="mt-6 space-y-8">
        {sections.map((section) => {
          const tone = sectionTone(section.score);
          return (
            <div key={section.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold">{section.title}</h3>
                  <p className="mt-0.5 text-xs text-muted">{section.blurb}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-xl font-extrabold tabular-nums ${tone.text}`}>
                    {section.score}
                    <span className="text-sm font-semibold text-muted">/100</span>
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Section
                  </p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
                <div
                  className={`h-full rounded-full ${tone.fill}`}
                  style={{ width: `${section.score}%` }}
                />
              </div>
              <ul className="mt-3 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory [scrollbar-width:thin]">
                {section.stats.map((stat) => (
                  <StatCard key={stat.id} stat={stat} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
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
    <div className="card-surface border-accent/25 bg-accent-soft/40 p-5 sm:p-7">
      <h2 className="text-xl font-extrabold sm:text-2xl">
        Want to solve your speaking?
      </h2>
      <p className="mt-2 text-sm text-muted">
        Don&apos;t scroll past this. Pick a next step now.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <a
          href={THOUGHTS2WORDS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-center no-underline"
        >
          Thoughts2Words
        </a>
        <a
          href={COACH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-center no-underline"
        >
          Speak About My Challenges With A Coach
        </a>
      </div>
    </div>
  );
}

export function DiagnosisPage({ report }: DiagnosisPageProps) {
  const strengths = report.mainChallenge.strengths;
  const improvements = report.mainChallenge.improvements;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10 animate-fade-up">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Diagnosis
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Your Communication Report
        </h1>
        <p className="mt-3 text-4xl font-extrabold tabular-nums">
          {Math.round(report.overallScore)}
          <span className="text-lg font-semibold text-muted"> / 100</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-accent">{report.level}</p>
        <a
          href={THOUGHTS2WORDS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-5 max-w-md text-center no-underline"
        >
          Want to solve your speaking?
        </a>
      </div>

      <div className="card-surface p-5 sm:p-7">
        <h2 className="text-lg font-extrabold sm:text-xl">Your Main Focus:</h2>
        <p className="mt-1 text-base font-bold text-accent">
          {report.mainChallenge.title}
        </p>
        <div className="mt-5">
          <ChallengeVisual imageKey={report.mainChallenge.imageKey} />
        </div>
        <BalancedBlock
          strengths={strengths}
          improvements={improvements}
          fallback={report.mainChallenge.summary}
        />
      </div>

      <div className="card-surface mt-5 overflow-hidden p-5 sm:p-7">
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

      <div className="card-surface mt-5 border-accent/20 bg-accent-soft/50 p-5 sm:p-7">
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
