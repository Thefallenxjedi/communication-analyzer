"use client";

import { useEffect, useState } from "react";

const PREP_STEPS = [
  "Checking your voice…",
  "Preparing your audio…",
] as const;

const ANALYZE_STEPS = [
  "Transcribing what you said…",
  "Scoring EliteSpeak markers…",
  "Building your sentence timeline…",
  "Preparing your free report…",
] as const;

type AnalyzingStateProps = {
  status?: string;
  /** Client media prep vs server analysis */
  mode?: "preparing" | "analyzing";
};

export function AnalyzingState({
  status,
  mode = "analyzing",
}: AnalyzingStateProps) {
  const steps = mode === "preparing" ? PREP_STEPS : ANALYZE_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    setStepIndex(0);
    setElapsedSec(0);
  }, [mode]);

  useEffect(() => {
    const last = steps.length - 1;
    // Advance through steps but hold on the last one until the real request finishes
    const id = window.setInterval(() => {
      setStepIndex((i) => (i < last ? i + 1 : i));
    }, 4500);
    return () => window.clearInterval(id);
  }, [steps.length]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  const onLast = stepIndex >= steps.length - 1;
  // Cap visual progress under 100% while still working
  const progress = onLast
    ? 92
    : Math.min(88, ((stepIndex + 1) / steps.length) * 85);

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-6 py-24 animate-fade-up">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon">
        {mode === "preparing" ? "Preparing" : "Analyzing"}
      </p>
      <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Listening carefully
      </h2>
      <p className="mt-3 text-center text-sm text-zinc-400">
        {status || steps[stepIndex]}
      </p>
      {elapsedSec >= 20 && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Still working — full reports often take 30–90 seconds.
        </p>
      )}

      <div className="mt-10 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="relative h-2 rounded-full bg-neon transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 animate-progress-shine bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>

      <ul className="mt-10 w-full space-y-3">
        {steps.map((label, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                done
                  ? "border-neon/30 bg-neon/10 text-neon"
                  : active
                    ? "border-white/20 bg-white/5 text-white"
                    : "border-transparent text-zinc-500"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-neon text-accent-dark"
                    : active
                      ? "border border-neon text-neon animate-pulse-soft"
                      : "border border-white/20 text-zinc-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={active ? "font-semibold" : ""}>
                {active && onLast ? `${label} (still working…)` : label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
