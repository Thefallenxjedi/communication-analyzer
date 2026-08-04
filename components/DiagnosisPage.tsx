"use client";

import type { DiagnosisReport } from "@/lib/schema";
import { ChallengeVisual } from "@/components/ChallengeVisual";

/** Placeholder outbound links — replace when you have real URLs */
export const THOUGHTS2WORDS_URL =
  process.env.NEXT_PUBLIC_THOUGHTS2WORDS_URL || "https://thoughts2words.com";
export const COACH_URL =
  process.env.NEXT_PUBLIC_COACH_URL || "https://calendly.com";

type DiagnosisPageProps = {
  report: DiagnosisReport;
  onReset: () => void;
};

function SolveCtas() {
  return (
    <div className="card-surface border-accent/25 bg-accent-soft/40 p-5 sm:p-7">
      <h2 className="text-xl font-extrabold">Want to begin solving these?</h2>
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

export function DiagnosisPage({ report, onReset }: DiagnosisPageProps) {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10 animate-fade-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
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
        </div>
        <button type="button" onClick={onReset} className="btn-secondary shrink-0">
          Analyze another
        </button>
      </div>

      <div className="card-surface p-5 sm:p-7">
        <h2 className="text-lg font-extrabold sm:text-xl">Your Main Challenge:</h2>
        <p className="mt-1 text-base font-bold text-accent">
          {report.mainChallenge.title}
        </p>
        <div className="mt-5">
          <ChallengeVisual imageKey={report.mainChallenge.imageKey} />
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
          {report.mainChallenge.summary}
        </p>
      </div>

      {/* Mid-page CTAs — visible on mobile without long scroll */}
      <div className="mt-5">
        <SolveCtas />
      </div>

      <div className="card-surface mt-5 p-5 sm:p-7">
        <h2 className="text-lg font-extrabold">Your Minor Challenges:</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {report.minorChallenges}
        </p>
      </div>

      <div className="card-surface mt-5 border-accent/20 bg-accent-soft/50 p-5 sm:p-7">
        <h2 className="text-lg font-extrabold">Your Solutions:</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
          {report.solutionsCopy}
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-extrabold sm:text-xl">Where you rank</h2>
        <p className="mt-1 text-sm text-muted">
          10 scores on how you speak — higher is stronger.
        </p>
        <ul className="mt-5 space-y-3">
          {report.stats.map((stat) => (
            <li key={stat.id} className="card-surface px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{stat.label}</span>
                <span className="text-sm font-extrabold tabular-nums text-accent">
                  {stat.score}/10
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${stat.score * 10}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Repeat CTAs after stats for people who scrolled */}
      <div className="mt-8">
        <SolveCtas />
      </div>

      <p className="mt-10 text-center text-xs text-muted">
        Free coaching diagnosis for practice — not a clinical assessment.
      </p>
    </section>
  );
}
