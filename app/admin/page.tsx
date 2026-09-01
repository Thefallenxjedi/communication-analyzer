"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode} from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/AdminHeader";
import { useAdminStaff } from "@/components/AdminShell";
import type { AnalysisListItem, AnalysisStats } from "@/lib/analyses";
import type { SurveyStats } from "@/lib/surveys";
import {
  captureMethodBadgeClass,
  formatCaptureMethodLabel,
  normalizeCaptureMethod} from "@/lib/capture-method";
import { formatUsd } from "@/lib/llm-cost";

/** Admin-only palette — calm teal/emerald, not funnel red. */
const adminUi = {
  brand: "text-teal-700",
  score: "text-emerald-700",
  metric: "text-teal-800",
  chart: "bg-teal-500",
  link: "text-teal-700 hover:text-teal-900",
  focus: "focus:border-teal-500 focus:ring-teal-500/20",
  checkbox: "accent-teal-600",
  primaryBtn:
    "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-teal-600 px-6 font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-55 sm:w-auto sm:min-w-[12rem]",
  failedBadge: "bg-slate-100 text-slate-700",
  failedText: "text-slate-600",
  dangerText: "text-rose-600",
  dangerBtn: "text-rose-700 hover:text-rose-800"} as const;

/** Sticky contact column — name + email stay visible while scrolling. */
const adminSticky = {
  contact:
    "sticky left-0 z-10 w-[10rem] min-w-[10rem] max-w-[10rem] bg-card shadow-[4px_0_8px_-2px_rgba(17,24,39,0.12)]",
  headContact:
    "sticky left-0 z-20 w-[10rem] min-w-[10rem] max-w-[10rem] bg-track/95 shadow-[4px_0_8px_-2px_rgba(17,24,39,0.12)] backdrop-blur-sm"} as const;

function formatDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function formatAnalysisMs(
  ms: number | null | undefined,
  estimated?: boolean,
): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "—";
  const sec = Math.round(ms / 1000);
  let label: string;
  if (sec < 60) label = `${sec}s`;
  else {
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    label = r > 0 ? `${m}m ${r}s` : `${m}m`;
  }
  return estimated ? `~${label}` : label;
}

function formatWhen(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

/** Shorter timestamp so the analyses table fits without horizontal scroll. */
function formatWhenCompact(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"});
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

type StackCounts = {
  completed: number;
  failed: number;
  incomplete: number;
};

type StackBar = {
  label: string;
  stacks: StackCounts;
};

function rowStackKind(row: AnalysisListItem): keyof StackCounts {
  if (row.status === "failed") return "failed";
  if (row.overallScore > 0) return "completed";
  return "incomplete";
}

function emptyStacks(): StackCounts {
  return { completed: 0, failed: 0, incomplete: 0 };
}

function stackTotal(stacks: StackCounts): number {
  return stacks.completed + stacks.failed + stacks.incomplete;
}

function addToStacks(stacks: StackCounts, kind: keyof StackCounts) {
  stacks[kind] += 1;
}

/** Last N UTC calendar days from loaded admin rows. */
function dayStacksFromRows(
  rows: AnalysisListItem[],
  numDays = 14,
): { date: string; stacks: StackCounts }[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const out: { date: string; stacks: StackCounts }[] = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const start = todayUtc.getTime() - i * dayMs;
    const end = start + dayMs;
    const stacks = emptyStacks();
    for (const row of rows) {
      const t = new Date(row.createdAt).getTime();
      if (Number.isNaN(t) || t < start || t >= end) continue;
      addToStacks(stacks, rowStackKind(row));
    }
    out.push({
      date: new Date(start).toISOString().slice(0, 10),
      stacks});
  }
  return out;
}

function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate.slice(5);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC"});
}

/** Roll daily stacks into calendar weeks (Mon–Sun UTC). */
function weeksFromDayStacks(
  days: { date: string; stacks: StackCounts }[],
): StackBar[] {
  const map = new Map<string, { start: string; stacks: StackCounts }>();
  for (const d of days) {
    const dt = new Date(`${d.date}T12:00:00Z`);
    if (Number.isNaN(dt.getTime())) continue;
    const day = dt.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(dt);
    monday.setUTCDate(dt.getUTCDate() + mondayOffset);
    const key = monday.toISOString().slice(0, 10);
    const cur = map.get(key) || { start: key, stacks: emptyStacks() };
    cur.stacks.completed += d.stacks.completed;
    cur.stacks.failed += d.stacks.failed;
    cur.stacks.incomplete += d.stacks.incomplete;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, w]) => ({
      label: `W/o ${dayLabel(w.start)}`,
      stacks: w.stacks}));
}

const stackColors = {
  completed: "bg-emerald-500",
  incomplete: "bg-amber-400",
  failed: "bg-rose-500"} as const;

function StackedAttemptsChart({
  title,
  bars}: {
  title: string;
  bars: StackBar[];
}) {
  const max = Math.max(1, ...bars.map((b) => stackTotal(b.stacks)));
  const chartH = 140;

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">
          {title}
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-muted">
          <span className="inline-flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-sm ${stackColors.completed}`}
            />
            Completed
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-sm ${stackColors.incomplete}`}
            />
            Incomplete
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-sm ${stackColors.failed}`}
            />
            Failed
          </span>
        </div>
      </div>
      <div
        className="mt-4 flex items-end gap-1.5 sm:gap-2"
        style={{ height: chartH + 40 }}
      >
        {bars.map((b) => {
          const total = stackTotal(b.stacks);
          const barPx =
            total <= 0
              ? 4
              : Math.max(12, Math.round((total / max) * chartH));
          const completedPx =
            total > 0
              ? Math.round((b.stacks.completed / total) * barPx)
              : 0;
          const incompletePx =
            total > 0
              ? Math.round((b.stacks.incomplete / total) * barPx)
              : 0;
          // Only paint failed when there were real failures — leftover height
          // on empty days must not become a fake red segment.
          const failedPx =
            total > 0 && b.stacks.failed > 0
              ? Math.max(0, barPx - completedPx - incompletePx)
              : 0;
          const tip = `${b.label}: ${total} total (${b.stacks.completed} completed, ${b.stacks.incomplete} incomplete, ${b.stacks.failed} failed)`;

          return (
            <div
              key={b.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={tip}
            >
              <span className="text-[10px] font-bold tabular-nums text-foreground">
                {total > 0 ? total : ""}
              </span>
              <div
                className={`flex w-full max-w-[2.75rem] flex-col justify-end overflow-hidden rounded-t-md ${
                  total > 0 ? "" : "bg-track"
                }`}
                style={{ height: barPx }}
              >
                {completedPx > 0 ? (
                  <div
                    className={stackColors.completed}
                    style={{ height: completedPx }}
                  />
                ) : null}
                {incompletePx > 0 ? (
                  <div
                    className={stackColors.incomplete}
                    style={{ height: incompletePx }}
                  />
                ) : null}
                {failedPx > 0 ? (
                  <div
                    className={stackColors.failed}
                    style={{ height: failedPx }}
                  />
                ) : null}
              </div>
              <span className="w-full truncate text-center text-[9px] leading-tight text-muted sm:text-[10px]">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type InsightsRange = "all" | "7d" | "30d" | "custom";

type BreakdownRow = { label: string; count: number; percent: number };

function completedRows(rows: AnalysisListItem[]): AnalysisListItem[] {
  return rows.filter((r) => r.status !== "failed" && r.overallScore > 0);
}

function insightsBounds(
  range: InsightsRange,
  customFrom: string,
  customTo: string,
): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (range === "all") return { from: null, to: null };
  if (range === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (range === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  const from = customFrom
    ? new Date(`${customFrom}T00:00:00`)
    : null;
  const to = customTo ? new Date(`${customTo}T23:59:59.999`) : null;
  return { from, to };
}

function rowsInRange(
  rows: AnalysisListItem[],
  from: Date | null,
  to: Date | null,
): AnalysisListItem[] {
  return rows.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    if (Number.isNaN(t)) return false;
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  });
}

function focusBreakdown(rows: AnalysisListItem[]): BreakdownRow[] {
  const total = rows.length;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const focus = (r.mainFocus || "").trim() || "Unknown";
    counts.set(focus, (counts.get(focus) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100)}))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

function levelBreakdown(rows: AnalysisListItem[]): BreakdownRow[] {
  const total = rows.length;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const level = (r.level || "").trim() || "Unknown";
    counts.set(level, (counts.get(level) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100)}))
    .sort((a, b) => b.count - a.count);
}

function InsightsDateFilter({
  range,
  customFrom,
  customTo,
  onRangeChange,
  onCustomFromChange,
  onCustomToChange,
  completedCount,
  countLabel = "completed in range"}: {
  range: InsightsRange;
  customFrom: string;
  customTo: string;
  onRangeChange: (r: InsightsRange) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  completedCount: number;
  countLabel?: string;
}) {
  const presets: { id: InsightsRange; label: string }[] = [
    { id: "all", label: "All" },
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="inline-flex rounded-xl border border-border bg-track/40 p-0.5 text-xs font-bold">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onRangeChange(p.id)}
            className={`rounded-lg px-2.5 py-1.5 sm:px-3 ${
              range === p.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {range === "custom" ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-muted">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className={`rounded-lg border border-border bg-background px-2 py-1.5 outline-none ${adminUi.focus}`}
            />
          </label>
          <label className="flex items-center gap-1.5 text-muted">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className={`rounded-lg border border-border bg-background px-2 py-1.5 outline-none ${adminUi.focus}`}
            />
          </label>
        </div>
      ) : null}
      <span className="text-xs text-muted">
        {completedCount} {countLabel}
      </span>
    </div>
  );
}

const ATTEMPTS_CUSTOM_MIN_DAYS = 15;
const ATTEMPTS_CUSTOM_MAX_DAYS = 90;

function AttemptsCharts({ rows }: { rows: AnalysisListItem[] }) {
  const [range, setRange] = useState<"7d" | "custom">("7d");
  const [customDays, setCustomDays] = useState(ATTEMPTS_CUSTOM_MIN_DAYS);
  const [mode, setMode] = useState<"day" | "week">("day");

  const spanDays =
    range === "7d"
      ? 7
      : Math.min(
          ATTEMPTS_CUSTOM_MAX_DAYS,
          Math.max(ATTEMPTS_CUSTOM_MIN_DAYS, customDays || ATTEMPTS_CUSTOM_MIN_DAYS),
        );

  const dayData = useMemo(
    () => dayStacksFromRows(rows, spanDays),
    [rows, spanDays],
  );
  const dayBars: StackBar[] = dayData.map((d) => ({
    label: dayLabel(d.date),
    stacks: d.stacks}));
  const weekBars = useMemo(() => weeksFromDayStacks(dayData), [dayData]);
  const chartTitle =
    mode === "week"
      ? `Last ${spanDays} days by week (UTC)`
      : `Last ${spanDays} days (UTC)`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">
          Attempts
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-track/40 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setRange("7d");
                setMode("day");
              }}
              className={`rounded-lg px-3 py-1.5 ${
                range === "7d"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => {
                setRange("custom");
                setMode("week");
              }}
              className={`rounded-lg px-3 py-1.5 ${
                range === "custom"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              Custom
            </button>
          </div>
          {range === "custom" ? (
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Days
              <input
                type="number"
                min={ATTEMPTS_CUSTOM_MIN_DAYS}
                max={ATTEMPTS_CUSTOM_MAX_DAYS}
                value={customDays}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setCustomDays(n);
                }}
                onBlur={() => {
                  setCustomDays((n) =>
                    Math.min(
                      ATTEMPTS_CUSTOM_MAX_DAYS,
                      Math.max(ATTEMPTS_CUSTOM_MIN_DAYS, Math.round(n) || ATTEMPTS_CUSTOM_MIN_DAYS),
                    ),
                  );
                }}
                className={`w-16 rounded-lg border border-border bg-background px-2 py-1.5 tabular-nums outline-none ${adminUi.focus}`}
              />
              <span className="text-[10px]">({ATTEMPTS_CUSTOM_MIN_DAYS}+)</span>
            </label>
          ) : null}
          <div className="inline-flex rounded-xl border border-border bg-track/40 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode("day")}
              className={`rounded-lg px-3 py-1.5 ${
                mode === "day"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setMode("week")}
              className={`rounded-lg px-3 py-1.5 ${
                mode === "week"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <StackedAttemptsChart
          title={chartTitle}
          bars={mode === "day" ? dayBars : weekBars}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  mobileLabel,
  value,
  hint,
  valueClass = "",
  title}: {
  label: string;
  mobileLabel?: string;
  value: ReactNode;
  hint?: string;
  valueClass?: string;
  title?: string;
}) {
  return (
    <div className="card-surface p-2.5 sm:p-4" title={title}>
      <p className="text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted sm:text-xs">
        <span className="xl:hidden">{mobileLabel ?? label}</span>
        <span className="hidden xl:inline">{label}</span>
      </p>
      <p
        className={`mt-0.5 text-xl font-extrabold tabular-nums sm:mt-1 sm:text-3xl ${valueClass}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 hidden text-[11px] leading-snug text-muted lg:block">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  const { canEdit } = useAdminStaff();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<AnalysisListItem[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const [feedbackRange, setFeedbackRange] = useState<InsightsRange>("all");
  const [feedbackFrom, setFeedbackFrom] = useState("");
  const [feedbackTo, setFeedbackTo] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [insightsRange, setInsightsRange] = useState<InsightsRange>("all");
  const [insightsFrom, setInsightsFrom] = useState("");
  const [insightsTo, setInsightsTo] = useState("");

  const insightsCompleted = useMemo(() => {
    const { from, to } = insightsBounds(
      insightsRange,
      insightsFrom,
      insightsTo,
    );
    return completedRows(rowsInRange(rows, from, to));
  }, [rows, insightsRange, insightsFrom, insightsTo]);

  const filteredFocusBreakdown = useMemo(
    () => focusBreakdown(insightsCompleted),
    [insightsCompleted],
  );

  const filteredLevelBreakdown = useMemo(
    () => levelBreakdown(insightsCompleted),
    [insightsCompleted],
  );

  const loadSurveys = useCallback(
    async (
      range: InsightsRange,
      from: string,
      to: string,
    ) => {
      setFeedbackBusy(true);
      try {
        const { from: fromBound, to: toBound } = insightsBounds(range, from, to);
        const params = new URLSearchParams();
        if (fromBound) params.set("from", fromBound.toISOString().slice(0, 10));
        if (toBound) params.set("to", toBound.toISOString().slice(0, 10));
        const qs = params.toString();
        const res = await fetch(
          `/api/admin/surveys${qs ? `?${qs}` : ""}`);
        const data = (await res.json()) as { stats?: SurveyStats | null };
        if (res.ok) setSurveyStats(data.stats ?? null);
      } catch {
        setSurveyStats(null);
      } finally {
        setFeedbackBusy(false);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const analysesRes = await fetch(
        "/api/admin/analyses?limit=200&backfillTiming=1",
      );

      let data: {
        error?: string;
        analyses?: AnalysisListItem[];
        stats?: AnalysisStats | null;
      } = {};
      try {
        data = (await analysesRes.json()) as typeof data;
      } catch {
        throw new Error(
          `Admin API returned ${analysesRes.status} (not JSON). Check Vercel env + redeploy.`,
        );
      }
      if (!analysesRes.ok) {
        throw new Error(
          data.error ||
            `Could not load analyses (HTTP ${analysesRes.status}). Check ADMIN_PASSWORD and NEXT_PUBLIC_CONVEX_URL on Vercel.`,
        );
      }
      setRows(data.analyses || []);
      setStats(data.stats ?? null);
      setSelectedIds(new Set());
    } catch (err) {
      setRows([]);
      setStats(null);
      setSurveyStats(null);
      setSelectedIds(new Set());
      setError(err instanceof Error ? err.message : "Could not load.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSurveys(feedbackRange, feedbackFrom, feedbackTo);
  }, [feedbackRange, feedbackFrom, feedbackTo, loadSurveys]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map((r) => r.id)));
  };

  const onDelete = async (row: AnalysisListItem) => {
    const label = row.email || row.firstName || row.id;
    if (
      !window.confirm(
        `Delete this row?\n\n${label}\nScore: ${row.overallScore || "—"}\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(row.id);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/analyses?id=${encodeURIComponent(row.id)}`,
        {
          method: "DELETE"},
      );
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Delete failed.");
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const onBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} selected ${ids.length === 1 ? "row" : "rows"}?\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analyses", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"},
        body: JSON.stringify({ ids })});
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        deleted?: number;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Bulk delete failed.");
      }
      setSelectedIds(new Set());
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-[90rem] px-4 py-10">
        <AdminHeader />
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Analysis admin
        </h1>
        <p className="mt-2 text-sm text-muted">
          Leads from the homepage form (Incomplete until they finish — then that
          same row becomes Completed), scores, and PDF downloads. Kartra syncs
          after the report. Audio is never saved.
        </p>

        <div className="mt-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {rows.length} recent{" "}
                {rows.length === 1 ? "analysis" : "analyses"}
              </p>
              <div className="flex flex-wrap gap-2">
                {someSelected && canEdit ? (
                  <button
                    type="button"
                    disabled={bulkDeleting || busy}
                    onClick={() => void onBulkDelete()}
                    className={`btn-secondary !w-auto px-4 ${adminUi.dangerBtn}`}
                  >
                    {bulkDeleting
                      ? "Deleting…"
                      : `Delete selected (${selectedIds.size})`}
                  </button>
                ) : null}
                <Link
                  href="/admin/clients"
                  className="btn-secondary !w-auto px-4 inline-flex items-center justify-center"
                >
                  EliteSpeak Clients
                </Link>
                <Link
                  href="/admin/status"
                  className="btn-secondary !w-auto px-4 inline-flex items-center justify-center"
                >
                  System status
                </Link>
                <Link
                  href="/admin/prompt"
                  className="btn-secondary !w-auto px-4 inline-flex items-center justify-center text-rose-700 hover:text-rose-900"
                >
                  Diagnosis prompt
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void load()}
                  className="btn-secondary !w-auto px-4"
                >
                  {busy ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {error ? (
              <p className={`text-sm ${adminUi.dangerText}`}>{error}</p>
            ) : null}

            {stats ? (
              <div className="grid grid-cols-3 gap-2 xl:grid-cols-8 xl:gap-3">
                <StatCard
                  label="Completed"
                  mobileLabel="Complete"
                  value={stats.totalAttempts}
                  hint="Finished a report (score + diagnosis)."
                  title="Got a full diagnosis and score."
                />
                <StatCard
                  label="Failed"
                  mobileLabel="Failed"
                  value={stats.failedAttempts ?? 0}
                  hint="Tried to analyze; it broke (busy, timeout, error)."
                  valueClass={adminUi.failedText}
                  title="Analysis started but Gemini or the server did not finish."
                />
                <StatCard
                  label="Incomplete"
                  mobileLabel="Incomplete"
                  value={stats.incompleteLeads ?? 0}
                  hint="Gave email, then left before a report."
                  valueClass="text-amber-700"
                  title="Left an email but never received a score."
                />
                <StatCard
                  label="Unique browsers"
                  mobileLabel="Browsers"
                  value={stats.uniqueUsers}
                />
                <StatCard
                  label="Avg score"
                  mobileLabel="Avg"
                  value={stats.avgScore}
                  valueClass={adminUi.metric}
                />
                <StatCard
                  label="Avg gen time"
                  mobileLabel="Gen avg"
                  value={
                    stats.avgAnalysisDurationMs != null
                      ? formatAnalysisMs(stats.avgAnalysisDurationMs)
                      : "—"
                  }
                  hint={
                    stats.avgAnalysisDurationSampleCount
                      ? `Mean server time · ${stats.avgAnalysisDurationSampleCount} of last 20 attempts with data.`
                      : "Server generation time — fills in on new analyses."
                  }
                  title="Wall-clock time from our API to produce a result (includes YouTube download when applicable)."
                />
                <StatCard
                  label="Leads (email)"
                  mobileLabel="Leads"
                  value={stats.leadsWithEmail ?? 0}
                />
                <StatCard
                  label="Est. Gemini spend"
                  mobileLabel="Spend"
                  value={formatUsd(stats.totalCostUsd)}
                  valueClass="text-lg sm:text-2xl"
                  title="Estimated from tokens or clip length. Includes failed attempts."
                />
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wide">
                    System status
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Live health checks for Gemini, Convex, Kartra, and YouTube
                    integrations.
                  </p>
                </div>
                <Link
                  href="/admin/status"
                  className={`text-sm font-bold ${adminUi.link} hover:underline`}
                >
                  Open status page →
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wide">
                    Report feedback
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Aggregate CSAT from “Was this report useful?” (1–5). Individual
                    responses are not shown here.
                    {feedbackBusy ? " Updating…" : ""}
                  </p>
                </div>
                <InsightsDateFilter
                  range={feedbackRange}
                  customFrom={feedbackFrom}
                  customTo={feedbackTo}
                  onRangeChange={setFeedbackRange}
                  onCustomFromChange={setFeedbackFrom}
                  onCustomToChange={setFeedbackTo}
                  completedCount={surveyStats?.count ?? 0}
                  countLabel="responses in range"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-8">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    CSAT score
                  </p>
                  <p className={`text-2xl font-extrabold tabular-nums ${adminUi.metric}`}>
                    {surveyStats?.avgRating != null
                      ? `${surveyStats.avgRating.toFixed(1)}/5`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Responses
                  </p>
                  <p className="text-2xl font-extrabold tabular-nums">
                    {surveyStats?.count ?? 0}
                  </p>
                </div>
              </div>
              {surveyStats && surveyStats.count === 0 ? (
                <p className="mt-4 text-sm text-muted">No ratings in this range.</p>
              ) : null}
            </div>

            {rows.length > 0 ? (
              <AttemptsCharts rows={rows} />
            ) : null}

            {rows.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-extrabold uppercase tracking-wide">
                        Most common main challenges
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        From completed assessments. Helps spot if one habit
                        (like fillers) is over-represented.
                      </p>
                    </div>
                    <InsightsDateFilter
                      range={insightsRange}
                      customFrom={insightsFrom}
                      customTo={insightsTo}
                      onRangeChange={setInsightsRange}
                      onCustomFromChange={setInsightsFrom}
                      onCustomToChange={setInsightsTo}
                      completedCount={insightsCompleted.length}
                    />
                  </div>
                  <div className="card-surface mt-3 space-y-3 p-4 sm:p-5">
                    {filteredFocusBreakdown.length === 0 ? (
                      <p className="text-sm text-muted">
                        No completed assessments in this date range.
                      </p>
                    ) : (
                      filteredFocusBreakdown.map((row) => {
                        const max = Math.max(
                          1,
                          ...filteredFocusBreakdown.map((r) => r.count),
                        );
                        const widthPct = Math.max(
                          6,
                          Math.round((row.count / max) * 100),
                        );
                        return (
                          <div key={row.label}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate font-bold">
                                {row.label}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted">
                                {row.count} · {row.percent}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-track">
                              <div
                                className={`h-full rounded-full ${adminUi.chart}`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wide">
                    Level distribution
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Uses the same date filter as main challenges above.
                  </p>
                  <div className="card-surface mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-border bg-track/60 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Level</th>
                          <th className="px-4 py-3 font-semibold">Count</th>
                          <th className="px-4 py-3 font-semibold">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLevelBreakdown.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-6 text-center text-muted"
                            >
                              No completed assessments in this date range.
                            </td>
                          </tr>
                        ) : (
                          filteredLevelBreakdown.map((row) => (
                            <tr
                              key={row.label}
                              className="border-b border-border/70 last:border-0"
                            >
                              <td className="px-4 py-2.5 font-semibold">
                                {row.label}
                              </td>
                              <td className="px-4 py-2.5 tabular-nums font-bold">
                                {row.count}
                              </td>
                              <td className="px-4 py-2.5 tabular-nums text-muted">
                                {row.percent}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wide">
                  Recent analyses
                </h2>
                <p className="mt-1 w-full text-xs text-muted">
                  Completed = got a report. Failed = analysis error. Incomplete
                  = email captured, no score yet.
                </p>
                {rows.length > 0 ? (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`text-xs font-bold ${adminUi.link} hover:underline`}
                  >
                    {allSelected ? "Clear selection" : "Select all"}
                  </button>
                ) : null}
              </div>
              <div className="card-surface mt-3 overflow-x-auto">
                <table className="min-w-[52rem] w-full text-left text-xs">
                  <colgroup>
                    <col className="w-[10rem]" />
                    <col className="w-8" />
                    <col className="w-[6.5rem]" />
                    <col className="w-[5.75rem]" />
                    <col className="w-[5.25rem]" />
                    <col className="w-[2.75rem]" />
                    <col className="w-[3.25rem]" />
                    <col className="w-[3.5rem]" />
                    <col className="w-[4.25rem]" />
                    <col className="w-[9.5rem]" />
                    <col className="w-[2.75rem]" />
                    <col className="w-[3.25rem]" />
                    <col className="w-[3.25rem]" />
                    <col className="w-[3.25rem]" />
                  </colgroup>
                  <thead className="border-b border-border bg-track/60 text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className={`px-1.5 py-2 font-semibold ${adminSticky.headContact}`}>
                        Name / email
                      </th>
                      <th className="px-1.5 py-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={rows.length === 0 || bulkDeleting}
                          onChange={toggleSelectAll}
                          aria-label="Select all rows"
                          className={`h-3.5 w-3.5 ${adminUi.checkbox}`}
                        />
                      </th>
                      <th className="px-1.5 py-2 font-semibold">When</th>
                      <th className="px-1.5 py-2 font-semibold">Status</th>
                      <th className="px-1.5 py-2 font-semibold">Input</th>
                      <th className="px-1.5 py-2 font-semibold">Score</th>
                      <th className="px-1.5 py-2 font-semibold">Clip</th>
                      <th className="px-1.5 py-2 font-semibold">Gen</th>
                      <th className="px-1.5 py-2 font-semibold">Cost</th>
                      <th className="px-1.5 py-2 font-semibold">Focus</th>
                      <th className="px-1.5 py-2 font-semibold">Level</th>
                      <th className="px-1.5 py-2 font-semibold">CSAT</th>
                      <th className="px-1.5 py-2 font-semibold">Link</th>
                      <th className="px-1.5 py-2 font-semibold"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={14}
                          className="px-4 py-10 text-center text-muted"
                        >
                          No analyses yet. Run a diagnosis to create the first
                          row.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const failed = row.status === "failed";
                        const completed =
                          !failed && row.overallScore > 0;
                        const checked = selectedIds.has(row.id);
                        const reportHref = row.reportSlug
                          ? `https://app.elitespeakprogram.com/r/${row.reportSlug}`
                          : "";
                        const inputMethod =
                          normalizeCaptureMethod(row.captureMethod) ||
                          (row.source?.trim().toLowerCase() === "youtube"
                            ? "youtube"
                            : undefined);
                        const inputLabel = formatCaptureMethodLabel(
                          row.captureMethod,
                          row.source,
                        );
                        return (
                        <tr
                          key={row.id}
                          className="border-b border-border/70 last:border-0"
                        >
                          <td
                            className={`px-1.5 py-2 ${adminSticky.contact}`}
                            title={
                              [row.firstName, row.email].filter(Boolean).join(" · ") ||
                              undefined
                            }
                          >
                            <p className="truncate font-semibold leading-tight">
                              {row.firstName || "—"}
                            </p>
                            {row.email ? (
                              <p className="truncate text-[10px] leading-tight text-muted">
                                {row.email}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-1.5 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={bulkDeleting || deletingId === row.id}
                              onChange={() => toggleSelect(row.id)}
                              aria-label={`Select ${row.email || row.firstName || row.id}`}
                              className={`h-3.5 w-3.5 ${adminUi.checkbox}`}
                            />
                          </td>
                          <td
                            className="truncate px-1.5 py-2 text-[11px] text-muted"
                            title={formatWhen(row.createdAt)}
                          >
                            {formatWhenCompact(row.createdAt)}
                          </td>
                          <td className="px-1.5 py-2">
                            {failed ? (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight ${adminUi.failedBadge}`}
                              >
                                Failed
                              </span>
                            ) : completed ? (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-emerald-800">
                                Completed
                              </span>
                            ) : (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-amber-900">
                                Incomplete
                              </span>
                            )}
                          </td>
                          <td className="px-1.5 py-2">
                            {inputMethod ? (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight ${captureMethodBadgeClass(inputMethod)}`}
                              >
                                {inputLabel}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className={`px-1.5 py-2 font-bold tabular-nums ${adminUi.score}`}>
                            {completed ? row.overallScore : "—"}
                          </td>
                          <td className="px-1.5 py-2 tabular-nums">
                            {formatDuration(row.durationSec)}
                          </td>
                          <td
                            className="px-1.5 py-2 tabular-nums"
                            title={
                              !completed && !failed
                                ? "No analysis ran yet"
                                : row.analysisDurationEstimated
                                  ? "Estimated generation time (legacy row — not measured live)"
                                  : "Server time to generate result"
                            }
                          >
                            {!completed && !failed
                              ? "—"
                              : formatAnalysisMs(
                                  row.analysisDurationMs,
                                  row.analysisDurationEstimated,
                                )}
                          </td>
                          <td
                            className="px-1.5 py-2 tabular-nums"
                            title={
                              row.inputTokens || row.outputTokens
                                ? `${row.inputTokens ?? 0} in / ${row.outputTokens ?? 0} out tokens`
                                : undefined
                            }
                          >
                            {formatUsd(row.costUsd)}
                          </td>
                          <td
                            className="truncate px-1.5 py-2"
                            title={failed ? undefined : row.mainFocus || undefined}
                          >
                            {failed ? "—" : row.mainFocus || "—"}
                          </td>
                          <td
                            className="truncate px-1.5 py-2 text-muted"
                            title={
                              failed
                                ? row.failureReason || undefined
                                : row.level || undefined
                            }
                          >
                            {failed ? (
                              <span className={`font-medium ${adminUi.failedText}`}>
                                {row.failureReason || "Error"}
                              </span>
                            ) : (
                              row.level || "—"
                            )}
                          </td>
                          <td
                            className="px-1.5 py-2 tabular-nums font-semibold"
                            title={row.surveyComment || undefined}
                          >
                            {row.surveyRating != null && row.surveyRating > 0
                              ? `${row.surveyRating}/5`
                              : "—"}
                          </td>
                          <td className="px-1.5 py-2">
                            {reportHref ? (
                              <a
                                href={reportHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`font-bold ${adminUi.link} hover:underline`}
                              >
                                ↗
                              </a>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-1.5 py-2 text-right">
                            <button
                              type="button"
                              disabled={deletingId === row.id || busy || bulkDeleting}
                              onClick={() => void onDelete(row)}
                              className={`font-bold ${adminUi.dangerText} hover:underline disabled:opacity-50`}
                            >
                              {deletingId === row.id ? "…" : "Del"}
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {stats?.topUsers?.length ? (
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wide">
                  Most attempts (same browser id)
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Repeat visitors by anonymous browser id — useful for spotting
                  test traffic or power users.
                </p>
                <div className="card-surface mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-track/60 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Anonymous ID</th>
                        <th className="px-4 py-3 font-semibold">Attempts</th>
                        <th className="px-4 py-3 font-semibold">Last score</th>
                        <th className="px-4 py-3 font-semibold">Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topUsers.map((u) => (
                        <tr
                          key={u.anonymousId}
                          className="border-b border-border/70 last:border-0"
                        >
                          <td
                            className="max-w-[12rem] truncate px-4 py-2.5 font-mono text-xs"
                            title={u.anonymousId}
                          >
                            {shortId(u.anonymousId)}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums font-bold">
                            {u.attempts}
                          </td>
                          <td className={`px-4 py-2.5 tabular-nums ${adminUi.score}`}>
                            {u.lastScore}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                            {formatWhen(u.lastAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
      </main>
    </div>
  );
}
