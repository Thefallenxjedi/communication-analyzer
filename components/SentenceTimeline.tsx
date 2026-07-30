"use client";

import type { SentenceTimelineItem, WordTag } from "@/lib/schema";

type SentenceTimelineProps = {
  items: SentenceTimelineItem[];
};

const TAG_STYLES: Record<WordTag, string> = {
  good: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40",
  filler: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40",
  needs_work: "bg-red-500/20 text-red-300 ring-1 ring-red-500/40",
  neutral: "bg-white/10 text-zinc-300 ring-1 ring-white/15",
};

const TAG_LABELS: Record<WordTag, string> = {
  good: "Good",
  filler: "Filler",
  needs_work: "Needs work",
  neutral: "Neutral",
};

function formatRange(item: SentenceTimelineItem): string {
  if (item.timestamp) return item.timestamp;
  if (item.startSec == null) return "—";
  const start = formatSec(item.startSec);
  if (item.endSec == null) return start;
  return `${start}–${formatSec(item.endSec)}`;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

export function SentenceTimeline({ items }: SentenceTimelineProps) {
  if (!items.length) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-white">
            Sentence timeline
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Each row is one spoken sentence across time — scored 1–10 with a tip,
            and words marked good, filler, or needs work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
          {(Object.keys(TAG_LABELS) as WordTag[]).map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2.5 py-1 ${TAG_STYLES[tag]}`}
            >
              {TAG_LABELS[tag]}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <article
            key={`${item.startSec ?? index}-${index}`}
            className="rounded-2xl border border-border bg-white/[0.04] p-4 sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs font-semibold text-neon">
                {formatRange(item)}
                <span className="ml-2 text-zinc-500">Sentence {index + 1}</span>
              </p>
              <p
                className={`text-sm font-extrabold tabular-nums ${scoreColor(item.score)}`}
              >
                {item.score}
                <span className="text-zinc-500">/10</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 leading-relaxed">
              {item.words.map((w, wi) => (
                <span
                  key={`${index}-${wi}-${w.text}`}
                  className={`rounded-md px-1.5 py-0.5 text-sm ${TAG_STYLES[w.tag]}`}
                  title={TAG_LABELS[w.tag]}
                >
                  {w.text}
                </span>
              ))}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              <span className="font-semibold text-white">Suggestion: </span>
              {item.suggestion}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
