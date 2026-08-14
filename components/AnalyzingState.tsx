"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Counting the ums, likes, and “you knows”…",
  "Checking how much leftover meeting-anxiety is in your voice…",
  "Seeing if you said the point, then said it two more times…",
  "Rating your fake-it-till-you-make-it confidence…",
  "Timing whether you sprint, stall, or actually pause…",
  "Hunting for the one sentence that actually landed…",
  "Writing up the honest diagnosis…",
] as const;

type AnalyzingStateProps = {
  status?: string;
};

export function AnalyzingState({ status }: AnalyzingStateProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i < MESSAGES.length - 1 ? i + 1 : i));
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const onLast = index >= MESSAGES.length - 1;
  const progress = onLast
    ? Math.min(96, 88 + Math.floor(elapsed / 15))
    : Math.min(85, ((index + 1) / MESSAGES.length) * 80);

  return (
    <section className="mx-auto flex min-h-[75dvh] w-full max-w-md flex-col justify-center px-4 py-16 animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-highlight px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground sm:text-xs">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden />
          Analyzing
        </p>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Listening harder than your last{" "}
          <span className="bg-highlight px-1.5 box-decoration-clone">
            Zoom call
          </span>
        </h1>
        <p className="mt-3 text-sm text-muted">
          {status || MESSAGES[index]}
          {onLast ? " (still working…)" : ""}
        </p>
        {elapsed >= 30 && (
          <p className="mt-2 text-xs text-muted">
            This can take up to about 90 seconds when traffic is high. Keep this
            tab open.
          </p>
        )}
        {elapsed >= 60 && (
          <p className="mt-1 text-xs font-semibold text-foreground/80">
            Almost there. Finishing your report…
          </p>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-full bg-track">
        <div
          className="h-2 rounded-full bg-highlight transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-8 space-y-2.5">
        {MESSAGES.map((msg, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <li
              key={msg}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : active
                    ? "border-highlight bg-highlight/40 font-semibold text-foreground"
                    : "border-transparent text-muted"
              }`}
            >
              <span className="min-w-0 flex-1">{msg}</span>
              {done ? (
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                  aria-label="Done"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : active ? (
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-accent" />
              ) : (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-track" />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
