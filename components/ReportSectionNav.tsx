"use client";

import { useEffect, useMemo, useState } from "react";
import { DIAGNOSIS_CALL_URL } from "@/lib/report-pdf";

export type ReportNavSection = {
  id: string;
  label: string;
};

export type ReportSummaryRail = {
  score: number;
  level: string;
  challenge: string;
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollProgressPct(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
}

export function ReportSectionNav({
  sections,
  summary,
}: {
  sections: ReportNavSection[];
  summary?: ReportSummaryRail;
}) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const [active, setActive] = useState(ids[0] ?? "");
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollPct(scrollProgressPct());
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          setActive(id);
        },
        { rootMargin: "-18% 0px -58% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);

  const pct = Math.round(scrollPct);
  const challengeLabel = summary?.challenge.replace(/\.$/, "") || "Clarity";

  return (
    <>
      <div
        className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-sm xl:hidden"
      >
        <div className="mx-auto max-w-2xl px-4 py-2 lg:max-w-3xl 2xl:max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-track">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-extrabold tabular-nums text-foreground">
              {pct}%
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-muted">
            through your report
          </p>
        </div>
      </div>

      {summary ? (
        <aside
          className="fixed left-4 top-24 z-40 hidden w-56 rounded-2xl border border-border bg-card/95 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur-sm xl:block 2xl:left-8 2xl:w-72 2xl:p-5"
          aria-label="Report summary"
        >
          <p className="text-4xl font-extrabold tabular-nums leading-none 2xl:text-5xl">
            {summary.score}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted">out of 100</p>
          <p className="mt-2 text-sm font-extrabold leading-snug 2xl:text-base">
            {summary.level}
          </p>

          <div className="mt-4 rounded-xl bg-accent-soft/70 px-3 py-2.5 ring-1 ring-accent/20">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent">
              Main challenge
            </p>
            <p className="mt-1 text-sm font-extrabold leading-snug text-foreground 2xl:text-base">
              {challengeLabel}
            </p>
          </div>

          <a
            href={DIAGNOSIS_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-5 block w-full text-center no-underline"
          >
            Speak with a coach
          </a>
        </aside>
      ) : null}

      <nav
        className="fixed right-4 top-24 z-40 hidden w-64 rounded-2xl border border-border bg-card/95 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm xl:block 2xl:right-8 2xl:w-80 2xl:p-6"
        aria-label="Report sections"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">
            Your report
          </p>
          <span className="text-base font-extrabold tabular-nums text-accent">
            {pct}%
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full rounded-full bg-track">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-semibold text-muted">
          scrolled through report
        </p>

        <ul className="mt-5 space-y-1.5 border-t border-border/60 pt-5">
          {sections.map((section) => {
            const isActive = active === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left text-base leading-snug transition 2xl:text-lg ${
                    isActive
                      ? "bg-accent-soft font-extrabold text-foreground"
                      : "font-semibold text-muted hover:bg-track/60 hover:text-foreground"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-muted" aria-hidden>
                    {isActive ? "→" : "·"}
                  </span>
                  <span>{section.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
