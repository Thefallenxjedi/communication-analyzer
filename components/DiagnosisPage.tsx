"use client";

import type { DiagnosisReport, StatId } from "@/lib/schema";
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

function barFill(score10: number): string {
  if (score10 >= 7) return "bg-accent";
  if (score10 >= 5) return "bg-amber-500";
  return "bg-rose-500";
}

function RankSections({
  stats,
}: {
  stats: DiagnosisReport["stats"];
}) {
  const sections = buildStatSections(stats);

  return (
    <div>
      <h2 className="text-lg font-extrabold sm:text-xl">Where you rank</h2>
      <p className="mt-1 text-sm text-muted">
        Strongest area first. Each section score, then its markers.
      </p>

      <div className="mt-6 space-y-8">
        {sections.map((section) => (
          <div key={section.id}>
            {/* Main section */}
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold sm:text-lg">
                  {section.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted">{section.blurb}</p>
              </div>
              <p className="shrink-0 text-lg font-extrabold tabular-nums text-accent">
                {section.score}
                <span className="text-sm font-semibold text-muted">/100</span>
              </p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-track">
              <div
                className={`h-full rounded-full ${barFill(section.score / 10)}`}
                style={{ width: `${section.score}%` }}
              />
            </div>

            {/* Types under this main */}
            <ul className="mt-4 space-y-3 border-l-2 border-border pl-4">
              {section.stats.map((stat) => (
                <li key={stat.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{stat.label}</span>
                    <span className="text-sm font-extrabold tabular-nums text-accent">
                      {stat.score}
                      <span className="font-semibold text-muted">/10</span>
                    </span>
                  </div>
                  {STAT_HINTS[stat.id as StatId] ? (
                    <p className="mt-0.5 text-xs text-muted">
                      {STAT_HINTS[stat.id as StatId]}
                    </p>
                  ) : null}
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-track">
                    <div
                      className={`h-full rounded-full ${barFill(stat.score)}`}
                      style={{ width: `${stat.score * 10}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
