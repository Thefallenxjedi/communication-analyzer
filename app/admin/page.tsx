"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AnalysisListItem, AnalysisStats } from "@/lib/analyses";

const ADMIN_SESSION_KEY = "ca_admin_password";

function formatDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function formatWhen(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

type DayStat = AnalysisStats["days"][number];

function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate.slice(5);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Roll daily stats into calendar weeks (Mon–Sun UTC). */
function weeksFromDays(days: DayStat[]): { label: string; attempts: number }[] {
  const map = new Map<string, { start: string; attempts: number }>();
  for (const d of days) {
    const dt = new Date(`${d.date}T12:00:00Z`);
    if (Number.isNaN(dt.getTime())) continue;
    const day = dt.getUTCDay(); // 0 Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(dt);
    monday.setUTCDate(dt.getUTCDate() + mondayOffset);
    const key = monday.toISOString().slice(0, 10);
    const cur = map.get(key) || { start: key, attempts: 0 };
    cur.attempts += d.attempts;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, w]) => ({
      label: `W/o ${dayLabel(w.start)}`,
      attempts: w.attempts,
    }));
}

function SimpleBarChart({
  title,
  bars,
}: {
  title: string;
  bars: { label: string; attempts: number }[];
}) {
  const max = Math.max(1, ...bars.map((b) => b.attempts));
  const chartH = 140;

  return (
    <div className="card-surface p-4 sm:p-5">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="mt-4 flex items-end gap-1.5 sm:gap-2" style={{ height: chartH + 40 }}>
        {bars.map((b) => {
          const barPx =
            b.attempts <= 0
              ? 4
              : Math.max(12, Math.round((b.attempts / max) * chartH));
          return (
            <div
              key={b.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${b.label}: ${b.attempts}`}
            >
              <span className="text-[10px] font-bold tabular-nums text-foreground">
                {b.attempts > 0 ? b.attempts : ""}
              </span>
              <div
                className={`w-full max-w-[2.75rem] rounded-t-md ${
                  b.attempts > 0 ? "bg-accent" : "bg-track"
                }`}
                style={{ height: barPx }}
              />
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

function AttemptsCharts({ days }: { days: DayStat[] }) {
  const [mode, setMode] = useState<"day" | "week">("day");
  // Default day view: last 7 days (API still returns 14)
  const last7 = days.slice(-7);
  const dayBars = last7.map((d) => ({
    label: dayLabel(d.date),
    attempts: d.attempts,
  }));
  const weekBars = weeksFromDays(days);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">
          Attempts
        </h2>
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
      <div className="mt-3">
        {mode === "day" ? (
          <SimpleBarChart title="Last 7 days (UTC)" bars={dayBars} />
        ) : (
          <SimpleBarChart title="By week (UTC)" bars={weekBars} />
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<AnalysisListItem[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(async (pwd: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analyses?limit=200", {
        headers: { "x-admin-password": pwd },
      });
      let data: {
        error?: string;
        analyses?: AnalysisListItem[];
        stats?: AnalysisStats | null;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error(
          `Admin API returned ${res.status} (not JSON). Check Vercel env + redeploy.`,
        );
      }
      if (!res.ok) {
        throw new Error(
          data.error ||
            `Could not load analyses (HTTP ${res.status}). Check ADMIN_PASSWORD and NEXT_PUBLIC_CONVEX_URL on Vercel.`,
        );
      }
      setRows(data.analyses || []);
      setStats(data.stats ?? null);
      setSelectedIds(new Set());
      setPassword(pwd);
      setUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, pwd);
      } catch {
        // ignore
      }
    } catch (err) {
      setUnlocked(false);
      setRows([]);
      setStats(null);
      setSelectedIds(new Set());
      try {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
      } catch {
        // ignore
      }
      setError(err instanceof Error ? err.message : "Unauthorized.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(ADMIN_SESSION_KEY)?.trim();
        if (saved) void load(saved);
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void load(password.trim());
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    setUnlocked(false);
    setRows([]);
    setStats(null);
    setSelectedIds(new Set());
    setPassword("");
    setError("");
  };

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
          method: "DELETE",
          headers: { "x-admin-password": password },
        },
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
      void load(password);
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
          "x-admin-password": password,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        deleted?: number;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Bulk delete failed.");
      }
      setSelectedIds(new Set());
      void load(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          EliteSpeak
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Analysis admin
        </h1>
        <p className="mt-2 text-sm text-muted">
          Leads from the homepage form (Incomplete until they finish), scores,
          and PDF downloads. Kartra syncs after the report. Audio is never saved.
        </p>

        {!unlocked ? (
          <form
            onSubmit={onSubmit}
            className="card-surface mt-8 max-w-md space-y-4 p-5 sm:p-6"
          >
            <label className="block text-sm font-semibold">
              Admin password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                autoComplete="current-password"
                required
              />
            </label>
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Checking…" : "Unlock"}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {rows.length} recent{" "}
                {rows.length === 1 ? "analysis" : "analyses"}
              </p>
              <div className="flex flex-wrap gap-2">
                {someSelected ? (
                  <button
                    type="button"
                    disabled={bulkDeleting || busy}
                    onClick={() => void onBulkDelete()}
                    className="btn-secondary !w-auto px-4 text-red-700"
                  >
                    {bulkDeleting
                      ? "Deleting…"
                      : `Delete selected (${selectedIds.size})`}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void load(password)}
                  className="btn-secondary !w-auto px-4"
                >
                  {busy ? "Refreshing…" : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="btn-secondary !w-auto px-4"
                >
                  Lock
                </button>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}

            {stats ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="card-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Completed
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums">
                    {stats.totalAttempts}
                  </p>
                </div>
                <div className="card-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Incomplete
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-amber-700">
                    {stats.incompleteLeads ?? 0}
                  </p>
                </div>
                <div className="card-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Unique browsers
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums">
                    {stats.uniqueUsers}
                  </p>
                </div>
                <div className="card-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Avg score
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-accent">
                    {stats.avgScore}
                  </p>
                </div>
                <div className="card-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Leads (email)
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums">
                    {stats.leadsWithEmail ?? 0}
                  </p>
                </div>
              </div>
            ) : null}

            {stats?.days?.length ? (
              <AttemptsCharts days={stats.days} />
            ) : null}

            {stats?.topUsers?.length ? (
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wide">
                  Most attempts (same browser id)
                </h2>
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
                          <td className="px-4 py-2.5 tabular-nums text-accent">
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

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wide">
                  Recent analyses
                </h2>
                {rows.length > 0 ? (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    {allSelected ? "Clear selection" : "Select all"}
                  </button>
                ) : null}
              </div>
              <div className="card-surface mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-track/60 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-3 font-semibold">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={rows.length === 0 || bulkDeleting}
                          onChange={toggleSelectAll}
                          aria-label="Select all rows"
                          className="h-4 w-4 accent-[var(--accent,#c9a227)]"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">When</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Speak time</th>
                      <th className="px-4 py-3 font-semibold">Main focus</th>
                      <th className="px-4 py-3 font-semibold">Level</th>
                      <th className="px-4 py-3 font-semibold"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-10 text-center text-muted"
                        >
                          No analyses yet. Run a diagnosis to create the first
                          row.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const completed = row.overallScore > 0;
                        const checked = selectedIds.has(row.id);
                        return (
                        <tr
                          key={row.id}
                          className="border-b border-border/70 last:border-0"
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={bulkDeleting || deletingId === row.id}
                              onChange={() => toggleSelect(row.id)}
                              aria-label={`Select ${row.email || row.firstName || row.id}`}
                              className="h-4 w-4 accent-[var(--accent,#c9a227)]"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted">
                            {formatWhen(row.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {completed ? (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                Completed
                              </span>
                            ) : (
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                                Incomplete
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {row.firstName || "—"}
                          </td>
                          <td
                            className="max-w-[12rem] truncate px-4 py-3 text-xs"
                            title={row.email || undefined}
                          >
                            {row.email || "—"}
                          </td>
                          <td className="px-4 py-3 font-extrabold tabular-nums text-accent">
                            {completed ? row.overallScore : "—"}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatDuration(row.durationSec)}
                          </td>
                          <td className="px-4 py-3">{row.mainFocus || "—"}</td>
                          <td className="px-4 py-3 text-muted">
                            {row.level || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={deletingId === row.id || busy || bulkDeleting}
                              onClick={() => void onDelete(row)}
                              className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                            >
                              {deletingId === row.id ? "Deleting…" : "Delete"}
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
          </div>
        )}
      </main>
    </div>
  );
}
