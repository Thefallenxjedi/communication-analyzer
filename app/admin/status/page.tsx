"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ServiceCheck, SystemStatusReport } from "@/lib/admin-status";

const ADMIN_SESSION_KEY = "ca_admin_password";

const adminUi = {
  brand: "text-teal-700",
  link: "text-teal-700 hover:text-teal-900",
  focus: "focus:border-teal-500 focus:ring-teal-500/20",
  primaryBtn:
    "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-teal-600 px-6 font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-55 sm:w-auto sm:min-w-[12rem]",
  dangerText: "text-rose-600"} as const;

function formatWhen(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"});
}

function statusBadge(status: ServiceCheck["status"]) {
  switch (status) {
    case "operational":
      return {
        label: "Operational",
        className: "bg-emerald-100 text-emerald-800",
        dot: "bg-emerald-500"};
    case "not_configured":
      return {
        label: "Not configured",
        className: "bg-amber-100 text-amber-900",
        dot: "bg-amber-500"};
    case "error":
      return {
        label: "Error",
        className: "bg-rose-100 text-rose-800",
        dot: "bg-rose-500"};
  }
}

function overallStyles(overall: SystemStatusReport["overall"]) {
  switch (overall) {
    case "operational":
      return "border-emerald-200 bg-emerald-50/80 text-emerald-900";
    case "partial":
      return "border-amber-200 bg-amber-50/80 text-amber-950";
    case "degraded":
      return "border-rose-200 bg-rose-50/80 text-rose-900";
  }
}

export default function AdminStatusPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SystemStatusReport | null>(null);

  const load = useCallback(async (pwd: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/status", {
        cache: "no-store"});
      const data = (await res.json()) as SystemStatusReport & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Wrong admin password.");
      }
      setReport(data);
      setPassword(pwd);
      setUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, pwd);
      } catch {
        // ignore
      }
    } catch (err) {
      setUnlocked(false);
      setReport(null);
      setError(err instanceof Error ? err.message : "Unauthorized.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load("");
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
    setReport(null);
    setPassword("");
    setError("");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`text-xs font-extrabold uppercase tracking-[0.14em] ${adminUi.brand}`}>
              EliteSpeak Admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              System status
            </h1>
            <p className="mt-2 text-sm text-muted">
              Live checks for integrations used by analysis, YouTube, and lead
              sync.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clients"
              className={`text-sm font-semibold ${adminUi.link} hover:underline`}
            >
              EliteSpeak Clients
            </Link>
            <Link
              href="/admin"
              className={`text-sm font-semibold ${adminUi.link} hover:underline`}
            >
              ← Back to admin
            </Link>
          </div>
        </div>

        {!unlocked ? (
          <form
            onSubmit={onSubmit}
            className="mt-10 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <label className="block text-sm font-semibold">
              Admin password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-offset-2 focus:ring-2 ${adminUi.focus}`}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? (
              <p className={`text-sm ${adminUi.dangerText}`}>{error}</p>
            ) : null}
            <button type="submit" disabled={busy} className={adminUi.primaryBtn}>
              {busy ? "Checking…" : "Unlock"}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {report
                  ? `Last updated ${formatWhen(report.checkedAt)}`
                  : "No checks yet"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void load(password)}
                  className="btn-secondary !w-auto px-4"
                >
                  {busy ? "Checking…" : "Check now"}
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
              <p className={`text-sm ${adminUi.dangerText}`}>{error}</p>
            ) : null}

            {report ? (
              <>
                <div
                  className={`rounded-2xl border p-5 sm:p-6 ${overallStyles(report.overall)}`}
                >
                  <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">
                    Status
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight">
                    {report.headline}
                  </p>
                  <p className="mt-2 text-sm opacity-80">
                    {report.services.filter((s) => s.status === "operational").length}
                    /{report.services.length} services operational
                  </p>
                </div>

                <section className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="border-b border-border px-4 py-3 sm:px-5">
                    <h2 className="text-sm font-extrabold uppercase tracking-wide">
                      Services
                    </h2>
                  </div>
                  <ul className="divide-y divide-border">
                    {report.services.map((service) => {
                      const badge = statusBadge(service.status);
                      return (
                        <li
                          key={service.id}
                          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-block h-2.5 w-2.5 rounded-full ${badge.dot}`}
                                aria-hidden
                              />
                              <p className="font-bold text-foreground">
                                {service.name}
                              </p>
                              {service.required ? (
                                <span className="rounded bg-track px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                                  Required
                                </span>
                              ) : (
                                <span className="rounded bg-track px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                                  Optional
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted">
                              {service.description}
                            </p>
                            <p className="mt-1.5 text-sm text-foreground/80">
                              {service.detail}
                            </p>
                          </div>
                          <div className="shrink-0 text-left sm:text-right">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            <p className="mt-1.5 text-[11px] tabular-nums text-muted">
                              {service.latencyMs != null
                                ? `${service.latencyMs} ms`
                                : "—"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
