"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAdminStaff } from "@/components/AdminShell";
import type { StaffRole } from "@/lib/staff-types";

type TeamRow = {
  id: string;
  email: string;
  name: string;
  staffRole: StaffRole;
};

export default function AdminTeamPage() {
  const { canManageTeam } = useAdminStaff();
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/staff?team=1");
    const data = (await res.json()) as { team?: TeamRow[]; error?: string };
    if (!res.ok) throw new Error(data.error || "Could not load team.");
    setTeam(data.team ?? []);
  }, []);

  useEffect(() => {
    if (!canManageTeam) return;
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load team.");
    });
  }, [canManageTeam, load]);

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), staffRole: role })});
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not assign role.");
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign role.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(rowEmail: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: rowEmail, staffRole: null })});
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not remove role.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove role.");
    } finally {
      setBusy(false);
    }
  }

  if (!canManageTeam) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted">Admin access required to manage team roles.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Team access</h1>
          <p className="mt-1 text-sm text-muted">
            Assign viewer, editor, or admin by Google email. User must sign in once
            before you can assign them.
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700 hover:text-teal-900">
          Back to admin
        </Link>
      </div>

      <form
        onSubmit={(e) => void onAssign(e)}
        className="card-surface mt-8 space-y-4 p-5 sm:p-6"
      >
        <h2 className="text-base font-extrabold uppercase tracking-wide">Add or update</h2>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border px-3 py-2.5"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="mt-2 w-full rounded-xl border border-border px-3 py-2.5"
          >
            <option value="viewer">Viewer — read only</option>
            <option value="editor">Editor — manage clients and content</option>
            <option value="admin">Admin — full access + team management</option>
          </select>
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-600 px-6 font-bold text-white hover:bg-teal-700 disabled:opacity-55"
        >
          {busy ? "Saving…" : "Save role"}
        </button>
      </form>

      <ul className="card-surface mt-6 divide-y divide-border">
        {team.length === 0 ? (
          <li className="p-5 text-sm text-muted">No staff roles assigned yet.</li>
        ) : (
          team.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
            >
              <div>
                <p className="font-semibold text-slate-900">{row.email}</p>
                {row.name ? (
                  <p className="text-sm text-muted">{row.name}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                  {row.staffRole}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRemove(row.email)}
                  className="text-sm font-semibold text-rose-700 hover:text-rose-800"
                >
                  Remove
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
