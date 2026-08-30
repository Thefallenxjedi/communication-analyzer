"use client";

import { useEffect, useMemo, useState } from "react";

export type ReportNavSection = {
  id: string;
  label: string;
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

export function ReportSectionNav({ sections }: { sections: ReportNavSection[] }) {
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

  return (
    <>
      <div
        className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-sm xl:hidden"
      >
        <div className="mx-auto max-w-2xl px-4 py-2">
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

      <nav
        className="fixed right-3 top-24 z-40 hidden w-[11.5rem] rounded-2xl border border-border bg-card/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm xl:block"
        aria-label="Report sections"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
            Your report
          </p>
          <span className="text-xs font-extrabold tabular-nums text-accent">
            {pct}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-track">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] font-semibold text-muted">
          scrolled through report
        </p>

        <ul className="mt-3 space-y-0.5 border-t border-border/60 pt-3">
          {sections.map((section) => {
            const isActive = active === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs leading-snug transition ${
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
