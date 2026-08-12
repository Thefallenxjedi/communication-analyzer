"use client";

import { useState } from "react";
import { IntroVideoPlayer } from "@/components/IntroVideoPlayer";
import { HomepageOptIn } from "@/components/HomepageOptIn";
import type { LeadPayload } from "@/lib/lead";

type LandingPageProps = {
  onCta: () => void;
  onLeadComplete: (lead: LeadPayload) => void;
};

const FAQ_ITEMS = [
  {
    id: "what-it-does",
    question: "What does this do?",
    body: (
      <>
        <p>
          You speak for{" "}
          <strong className="font-bold text-foreground">30 seconds to 2 minutes</strong>
          . We analyze how you sound — not a quiz, not a personality test.
        </p>
        <p className="mt-3">
          You get a clear diagnosis of clarity, structure, energy, fillers,
          confidence, and more — so you know what&apos;s working and what&apos;s
          costing you.
        </p>
      </>
    ),
  },
  {
    id: "what-you-get",
    question: "What do you get?",
    body: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            An <strong className="font-bold text-foreground">overall score</strong>{" "}
            (0–100) and level
          </li>
          <li>
            Your <strong className="font-bold text-foreground">main focus</strong>{" "}
            — the one habit to fix first
          </li>
          <li>
            A full breakdown across fluency, content, vocal delivery, and
            certainty
          </li>
          <li>
            A downloadable <strong className="font-bold text-foreground">PDF report</strong>{" "}
            you can keep and practice from
          </li>
        </ol>
        <p className="mt-3">
          Free coaching diagnosis for practice — not a clinical assessment.
        </p>
      </>
    ),
  },
  {
    id: "score-means",
    question: "What does the score mean?",
    body: (
      <>
        <p>
          Higher = stronger. Your overall score is the average of{" "}
          <strong className="font-bold text-foreground">15 main challenges</strong>{" "}
          (Part A) — things like clarity, structure, energy, pace, and
          confidence.
        </p>
        <p className="mt-3">
          Part B adds supporting signals (impact, assertiveness, visual
          language, and more). Those help explain the picture — they&apos;re not
          averaged into overall.
        </p>
        <p className="mt-3">
          A low score on one marker isn&apos;t a label. It&apos;s a{" "}
          <strong className="font-bold text-foreground">practice target</strong>.
        </p>
      </>
    ),
  },
  {
    id: "right-for-me",
    question: "Is this right for me?",
    body: (
      <>
        <p>
          If you speak in meetings, sales calls, interviews, videos, or
          presentations — yes.
        </p>
        <p className="mt-3">
          If you&apos;ve never heard yourself clearly and you want a straight
          answer on what to fix next —{" "}
          <strong className="font-bold text-foreground">
            chances are we can help.
          </strong>
        </p>
        <p className="mt-3 text-muted">
          If you only want entertainment or a clinical evaluation, this is not
          it.
        </p>
      </>
    ),
  },
] as const;

function scrollToForm() {
  document.getElementById("get-report")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function LandingPage({ onCta: _onCta, onLeadComplete }: LandingPageProps) {
  const [openId, setOpenId] = useState<string | null>("what-it-does");

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-background text-foreground">
      <section className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-4 py-8 text-center sm:py-10">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-highlight px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground sm:text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          Free speaking diagnosis
        </p>

        <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.22em] text-accent">
          EliteSpeak
        </p>

        <h1 className="mt-2 max-w-2xl text-[1.5rem] font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-[2.5rem]">
          Is how you speak{" "}
          <span className="bg-highlight px-1.5 box-decoration-clone">
            holding you back?
          </span>
        </h1>

        <p className="mt-3 max-w-xl text-sm font-medium text-muted sm:text-base">
          Speak for 30 seconds. Get a free, personalized report card of how you
          sound — score, strengths, and what to fix first.
        </p>

        <div className="mt-5 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-black shadow-[0_16px_48px_rgba(0,0,0,0.12)] sm:mt-6">
          <IntroVideoPlayer />
        </div>

        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Your score. Your main focus. What to practice next.
        </p>

        <div
          id="get-report"
          className="mt-6 w-full max-w-md scroll-mt-8 sm:mt-7"
        >
          <div className="card-surface mt-4 px-4 py-5 text-left sm:px-6 sm:py-6">
            <HomepageOptIn onComplete={onLeadComplete} />
          </div>
        </div>
      </section>

      {/* Hormozi-style Q&A — communication diagnosis */}
      <section className="border-t border-border bg-track/40 px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-2xl text-left">
          <p className="text-center text-xs font-extrabold uppercase tracking-[0.14em] text-accent">
            Straight answers
          </p>
          <h2 className="mt-2 text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Before you start
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted sm:text-base">
            What this is. What you get. What the score means.
          </p>

          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => {
              const open = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex w-full items-center justify-between gap-3 bg-[#111111] px-4 py-3.5 text-left sm:px-5"
                  >
                    <span className="text-sm font-bold text-white sm:text-base">
                      {item.question}
                    </span>
                    <span
                      className="shrink-0 text-lg font-light leading-none text-highlight"
                      aria-hidden
                    >
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-border px-4 py-4 text-sm leading-relaxed text-foreground/90 sm:px-5 sm:py-5 sm:text-[0.9375rem]">
                      {item.body}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold text-muted">
              Ready to hear how you actually sound?
            </p>
            <button
              type="button"
              onClick={scrollToForm}
              className="btn-highlight btn-primary-lg mt-4 max-w-md uppercase tracking-[0.1em]"
            >
              I&apos;M READY TO HEAR HOW I SOUND
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
