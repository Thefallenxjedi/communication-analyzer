"use client";

import { useState } from "react";
import type { EliteSpeakReport, MarkerResult } from "@/lib/schema";
import {
  getRankedMarkers,
  RARITY_TIERS,
  scoreLabel,
  type RankedMarker,
} from "@/lib/scoring";
import { MARKER_META } from "@/lib/scoring";
import { SentenceTimeline } from "@/components/SentenceTimeline";

type ReportDashboardProps = {
  report: EliteSpeakReport;
  onReset: () => void;
};

export function ReportDashboard({ report, onReset }: ReportDashboardProps) {
  const ranked = getRankedMarkers(report);
  const maxNumeric = Math.max(...ranked.map((m) => m.numeric ?? 0), 1);
  const [openId, setOpenId] = useState<string | null>(ranked[0]?.id ?? null);

  return (
    <section
      id="report"
      className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 animate-fade-up"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neon">
            Free EliteSpeak-style report
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Communication{" "}
            <span className="text-neon">Score</span> Ranking
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            20 markers scored 1–10 (higher is stronger). Expand any bar for
            coach notes, evidence, and drills.
            {report.hasVisualAnalysis
              ? " Visual cues from your video were included."
              : " Upload or record video to unlock visual-dependent markers."}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="btn-neon self-start rounded-full px-5 py-2.5 text-sm tracking-wide"
        >
          Analyze another
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-white/[0.04] px-6 py-6">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Overall
            </p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums text-white">
              {Math.round(report.overallScore)}
              <span className="text-xl font-semibold text-zinc-500">/100</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-neon">
              {report.band} · {scoreLabel(report.overallScore)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          {report.sessionOverview}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-go-green">
              What went well
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {report.keyObservations.wentWell}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
              What could improve
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {report.keyObservations.couldImprove}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-2.5">
          {ranked.map((m, index) => (
            <div key={m.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenId((id) => (id === m.id ? null : m.id))
                }
                className="block w-full text-left"
              >
                <RankBar
                  metric={m}
                  rank={index + 1}
                  widthPercent={
                    m.numeric == null
                      ? 42
                      : Math.max(42, (m.numeric / maxNumeric) * 100)
                  }
                />
              </button>
              {openId === m.id && <MarkerDetail result={m.result} />}
            </div>
          ))}
        </div>

        <aside className="flex flex-col gap-3">
          {RARITY_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="rounded-2xl px-4 py-4"
              style={{
                backgroundColor: tier.color,
                color: "textDark" in tier && tier.textDark ? "#222" : "#fff",
              }}
            >
              <p className="text-sm font-extrabold">{tier.title}</p>
              <p
                className={`mt-1.5 text-xs leading-relaxed ${
                  "textDark" in tier && tier.textDark
                    ? "text-zinc-600"
                    : "text-white/85"
                }`}
              >
                {tier.description}
              </p>
            </div>
          ))}
        </aside>
      </div>

      {report.sentenceTimeline && report.sentenceTimeline.length > 0 && (
        <SentenceTimeline items={report.sentenceTimeline} />
      )}

      <div className="mt-12">
        <h3 className="text-lg font-extrabold text-white">
          Top 3 Priority Drills
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {report.top3Drills.map((drill, i) => (
            <div
              key={`${drill.markerId}-${i}`}
              className="rounded-2xl border border-border bg-white/[0.04] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {MARKER_META[drill.markerId]?.label ?? drill.markerId}
              </p>
              <p className="mt-1 font-bold text-white">{drill.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {drill.steps}
              </p>
              <p className="mt-3 text-xs font-semibold text-neon">
                {drill.schedule}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        <ListBlock title="Strengths" items={report.summary.strengths} />
        <ListBlock title="Critical Gaps" items={report.summary.criticalGaps} />
        <ListBlock
          title="24-Hour Action Plan"
          items={report.summary.actionPlan24h}
        />
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-white/[0.04] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Transcript
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {report.transcript}
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-500">
        Free coaching report for practice — not a clinical or medical assessment.
      </p>
    </section>
  );
}

function RankBar({
  metric,
  rank,
  widthPercent,
}: {
  metric: RankedMarker;
  rank: number;
  widthPercent: number;
}) {
  const display = metric.numeric == null ? "N/E" : `${metric.numeric}/10`;

  return (
    <div
      className="relative flex min-h-[52px] items-center gap-3 overflow-hidden rounded-full px-3 py-2 text-white shadow-sm"
      style={{
        backgroundColor: metric.color,
        width: `${widthPercent}%`,
        minWidth: "280px",
        maxWidth: "100%",
        opacity: metric.numeric == null ? 0.55 : 1,
      }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
        {rank}
      </span>
      <span className="w-12 shrink-0 text-sm font-bold tabular-nums">
        {display}
      </span>
      <span className="shrink-0 text-base font-extrabold tracking-wide">
        {metric.short}
      </span>
      <span className="mx-1 hidden h-5 w-px shrink-0 bg-white/40 sm:block" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/95">
        {metric.label}
      </span>
    </div>
  );
}

function MarkerDetail({ result }: { result: MarkerResult }) {
  return (
    <div className="mb-2 mt-2 rounded-2xl border border-border bg-white/[0.04] p-5 text-sm text-zinc-300">
      {result.score === "not_enough_evidence" ? (
        <p className="text-amber-300">
          <strong className="text-white">Score: Not enough evidence.</strong>{" "}
          {result.notEnoughEvidenceReason || result.pattern}
        </p>
      ) : (
        <p>
          <strong className="text-white">Score:</strong> {result.score}/10
        </p>
      )}

      {result.rootCauses.length > 0 && (
        <div className="mt-3">
          <p className="font-bold text-white">Root Causes</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.rootCauses.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <EvidenceList title="What the Speaker did well" items={result.didWell} />
      <EvidenceList
        title="Where the Speaker fell short"
        items={result.fellShort}
      />

      <p className="mt-3">
        <strong className="text-white">Pattern:</strong> {result.pattern}
      </p>
      <p className="mt-2">
        <strong className="text-white">Coach&apos;s Notes:</strong>{" "}
        {result.coachNotes}
      </p>
      <div className="mt-3 rounded-xl border border-border bg-black/30 p-3">
        <p className="font-bold text-neon">
          Improvement: {result.improvementSuggestion.name}
        </p>
        <p className="mt-1">{result.improvementSuggestion.howTo}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {result.improvementSuggestion.reps} ·{" "}
          {result.improvementSuggestion.when}
        </p>
      </div>
    </div>
  );
}

function EvidenceList({
  title,
  items,
}: {
  title: string;
  items: {
    timestamp?: string;
    quoteOrBehavior: string;
    whyItMatters?: string;
  }[];
}) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <p className="font-bold text-white">{title}</p>
      <ul className="mt-1 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item.timestamp && (
              <span className="mr-2 font-mono text-xs text-neon">
                {item.timestamp}
              </span>
            )}
            <span>&ldquo;{item.quoteOrBehavior}&rdquo;</span>
            {item.whyItMatters && (
              <span className="text-zinc-500"> — {item.whyItMatters}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-lg font-extrabold text-white">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li
            key={`${title}-${i}`}
            className="flex gap-2 text-sm leading-relaxed text-zinc-400"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neon" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
