"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { CoachingClient, CoachingClientStatus } from "@/lib/coaching-clients";

const ADMIN_SESSION_KEY = "ca_admin_password";

const adminUi = {
  brand: "text-teal-700",
  link: "text-teal-700 hover:text-teal-900",
  focus: "focus:border-teal-500 focus:ring-teal-500/20",
  primaryBtn:
    "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-teal-600 px-6 font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-55 sm:w-auto sm:min-w-[12rem]",
  dangerText: "text-rose-600",
  dangerBtn: "text-rose-700 hover:text-rose-800",
} as const;

function todayInputValue(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayInputValue();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusClass(status: CoachingClientStatus): string {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "pending") return "bg-sky-100 text-sky-900";
  if (status === "paused") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

export default function AdminClientsPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<CoachingClient[]>([]);
  const [pendingClients, setPendingClients] = useState<CoachingClient[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState(todayInputValue);
  const [currentFocus, setCurrentFocus] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFocus, setEditFocus] = useState("");
  const [editStatus, setEditStatus] = useState<CoachingClientStatus>("active");
  const [editStartDate, setEditStartDate] = useState(todayInputValue());
  const [editMeetingLink, setEditMeetingLink] = useState("");
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const load = useCallback(async (pwd: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/clients", {
        headers: { "x-admin-password": pwd },
      });
      const pendingRes = await fetch("/api/admin/clients/pending", {
        headers: { "x-admin-password": pwd },
      });
      const data = (await res.json()) as {
        error?: string;
        clients?: CoachingClient[];
      };
      const pendingData = (await pendingRes.json()) as {
        clients?: CoachingClient[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Wrong admin password.");
      }
      setClients(data.clients || []);
      setPendingClients(pendingData.clients || []);
      setPassword(pwd);
      setUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, pwd);
      } catch {
        // ignore
      }
    } catch (err) {
      setUnlocked(false);
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(password.trim());
  }

  function logout() {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    setUnlocked(false);
    setClients([]);
    setPassword("");
    setError("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreateBusy(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          startDate,
          currentFocus: currentFocus.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        clients?: CoachingClient[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not create client.");
      }
      setClients(data.clients || []);
      setName("");
      setEmail("");
      setStartDate(todayInputValue());
      setCurrentFocus("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreateBusy(false);
    }
  }

  function startEdit(row: CoachingClient) {
    setEditingId(row.id);
    setEditFocus(row.currentFocus);
    setEditStatus(row.status);
    setEditStartDate(isoToDateInput(row.startDate));
    setEditMeetingLink(row.meetingLink);
  }

  async function onSaveEdit(id: string) {
    setRowBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          id,
          currentFocus: editFocus,
          status: editStatus,
          startDate: editStartDate,
          meetingLink: editMeetingLink,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        clients?: CoachingClient[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not update client.");
      }
      setClients(data.clients || []);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setRowBusyId(null);
    }
  }

  async function onApprove(id: string, clientName: string) {
    setRowBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/clients/pending", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ clientId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not approve client.");
      }
      setPendingClients((prev) => prev.filter((row) => row.id !== id));
      await load(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setRowBusyId(null);
    }
  }

  async function onDelete(id: string, clientName: string) {
    if (!window.confirm(`Remove ${clientName} from EliteSpeak Clients?`)) return;
    setRowBusyId(id);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/clients?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { "x-admin-password": password },
        },
      );
      const data = (await res.json()) as {
        error?: string;
        clients?: CoachingClient[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not delete client.");
      }
      setClients(data.clients || []);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-[90rem] px-4 py-10 lg:px-8">
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${adminUi.brand}`}>
          EliteSpeak
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              EliteSpeak Clients
            </h1>
            <p className="mt-2 text-base text-muted">
              Paid coaching clients only. Separate from the free analyzer
              leads on the main admin page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/client/login"
              className={`text-sm font-semibold ${adminUi.link} hover:underline`}
            >
              Client login
            </Link>
            <Link
              href="/admin"
              className={`text-sm font-semibold ${adminUi.link} hover:underline`}
            >
              ← Back to analysis admin
            </Link>
          </div>
        </div>

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
                className={`mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none ${adminUi.focus}`}
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
          <div className="mt-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {clients.length}{" "}
                {clients.length === 1 ? "client" : "clients"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin"
                  className="btn-secondary !w-auto px-4 no-underline"
                >
                  Analysis admin
                </Link>
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
              <p className={`text-sm ${adminUi.dangerText}`}>{error}</p>
            ) : null}

            {pendingClients.length > 0 ? (
              <section className="card-surface space-y-4 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">
                    Pending Google sign-ups
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Clients who signed in with Google and submitted their name.
                    Approve to grant program access.
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {pendingClients.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900">{row.name}</p>
                        <p className="text-sm text-muted">{row.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={rowBusyId === row.id}
                        onClick={() => void onApprove(row.id, row.name)}
                        className={adminUi.primaryBtn}
                      >
                        {rowBusyId === row.id ? "Approving…" : "Approve"}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <form
              onSubmit={(e) => void onCreate(e)}
              className="card-surface space-y-4 p-5 sm:p-6"
            >
              <h2 className="text-base font-extrabold uppercase tracking-wide">
                Add client
              </h2>
              <p className="text-base text-muted">
                Creates their coaching record. Login invites come in the next
                slice.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-base font-semibold">
                  Name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 80))}
                    className={`mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-base outline-none ${adminUi.focus}`}
                    required
                  />
                </label>
                <label className="block text-base font-semibold">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.slice(0, 200))}
                    className={`mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-base outline-none ${adminUi.focus}`}
                    required
                  />
                </label>
                <label className="block text-base font-semibold">
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-base outline-none ${adminUi.focus}`}
                    required
                  />
                </label>
                <label className="block text-base font-semibold">
                  Current focus{" "}
                  <span className="font-medium text-muted">(optional)</span>
                  <input
                    type="text"
                    value={currentFocus}
                    onChange={(e) =>
                      setCurrentFocus(e.target.value.slice(0, 120))
                    }
                    placeholder="e.g. Uncompressed Thought"
                    className={`mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-base outline-none ${adminUi.focus}`}
                  />
                </label>
              </div>
              {createError ? (
                <p className={`text-sm ${adminUi.dangerText}`}>{createError}</p>
              ) : null}
              <button
                type="submit"
                disabled={createBusy || !name.trim() || !email.trim()}
                className={adminUi.primaryBtn}
              >
                {createBusy ? "Saving…" : "Add client"}
              </button>
            </form>

            <div className="card-surface overflow-x-auto">
              <table className="min-w-full text-left text-base">
                <thead className="bg-track/80 text-sm font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2.5">Client</th>
                    <th className="px-3 py-2.5">Focus</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Now</th>
                    <th className="px-3 py-2.5">Last activity</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-muted"
                      >
                        No coaching clients yet. Add the people who already
                        paid.
                      </td>
                    </tr>
                  ) : (
                    clients.map((row) => {
                      const editing = editingId === row.id;
                      const rowBusy = rowBusyId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="border-t border-border align-top"
                        >
                          <td className="px-3 py-3.5">
                            <p className="text-lg font-bold">{row.name}</p>
                            <p className="mt-0.5 text-sm text-muted">{row.email}</p>
                          </td>
                          <td className="px-3 py-3">
                            {editing ? (
                              <input
                                type="text"
                                value={editFocus}
                                onChange={(e) =>
                                  setEditFocus(e.target.value.slice(0, 120))
                                }
                                className={`w-full min-w-[10rem] rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none ${adminUi.focus}`}
                              />
                            ) : (
                              row.currentFocus || (
                                <span className="text-muted">—</span>
                              )
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {editing ? (
                              <select
                                value={editStatus}
                                onChange={(e) =>
                                  setEditStatus(
                                    e.target.value as CoachingClientStatus,
                                  )
                                }
                                className={`rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none ${adminUi.focus}`}
                              >
                                <option value="active">active</option>
                                <option value="paused">paused</option>
                                <option value="completed">completed</option>
                              </select>
                            ) : (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusClass(row.status)}`}
                              >
                                {row.status}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white">
                              {row.currentStage || "Intro Call"}
                            </span>
                            {row.reviewRequired ? (
                              <p className="mt-1.5 text-sm font-extrabold uppercase tracking-wide text-amber-800">
                                Review required
                              </p>
                            ) : null}
                            {!row.onboardingComplete ? (
                              <p className="mt-1.5 text-sm font-semibold text-slate-500">
                                LinkedIn pending
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-muted">
                            {formatWhen(row.lastActivityAt)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              {editing ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={rowBusy}
                                    onClick={() => void onSaveEdit(row.id)}
                                    className="inline-flex min-h-9 items-center rounded-full bg-teal-600 px-4 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-55"
                                  >
                                    {rowBusy ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={rowBusy}
                                    onClick={() => setEditingId(null)}
                                    className="text-sm font-semibold text-muted"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Link
                                    href={`/admin/clients/${row.id}`}
                                    className="inline-flex min-h-11 items-center rounded-full bg-teal-600 px-5 text-base font-bold text-white no-underline hover:bg-teal-700"
                                  >
                                    Open
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={rowBusy}
                                    onClick={() => startEdit(row)}
                                    className="text-base font-semibold text-slate-600 hover:text-slate-900"
                                  >
                                    Edit
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() => void onDelete(row.id, row.name)}
                                className={`ml-1 text-base font-semibold ${adminUi.dangerBtn}`}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
