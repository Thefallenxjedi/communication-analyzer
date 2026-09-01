"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { PromptAddOn } from "@/lib/prompt-addons";
import type { DiagnosisCorePromptState } from "@/lib/diagnosis-core-prompt";

const ADMIN_SESSION_KEY = "ca_admin_password";

const adminUi = {
  brand: "text-teal-700",
  link: "text-teal-700 hover:text-teal-900",
  focus: "focus:border-teal-500 focus:ring-teal-500/20",
  checkbox: "accent-teal-600",
  primaryBtn:
    "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-teal-600 px-6 font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-55 sm:w-auto sm:min-w-[12rem]",
  dangerText: "text-rose-600",
  dangerBtn: "text-rose-700 hover:text-rose-800"} as const;

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

export default function AdminPromptPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [promptAddOns, setPromptAddOns] = useState<PromptAddOn[]>([]);
  const [addOnTitle, setAddOnTitle] = useState("");
  const [addOnBody, setAddOnBody] = useState("");
  const [addOnBusy, setAddOnBusy] = useState(false);
  const [addOnError, setAddOnError] = useState("");
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [showCorePrompt, setShowCorePrompt] = useState(true);
  const [corePromptDraft, setCorePromptDraft] = useState("");
  const [corePromptMeta, setCorePromptMeta] =
    useState<DiagnosisCorePromptState | null>(null);
  const [corePromptBusy, setCorePromptBusy] = useState(false);
  const [corePromptDirty, setCorePromptDirty] = useState(false);

  const load = useCallback(async (pwd: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/prompt-addons", {
      });
      const data = (await res.json()) as {
        error?: string;
        addOns?: PromptAddOn[];
        corePrompt?: DiagnosisCorePromptState | null;
      };
      if (!res.ok) {
        throw new Error(data.error || "Wrong admin password.");
      }
      setPromptAddOns(data.addOns || []);
      if (data.corePrompt) {
        setCorePromptMeta(data.corePrompt);
        setCorePromptDraft(data.corePrompt.body);
        setCorePromptDirty(false);
      }
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
    void load("");
  }, [load]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void load(password.trim());
  };

  const refreshAddOns = async () => {
    const res = await fetch("/api/admin/prompt-addons", {
    });
    const data = (await res.json()) as {
      addOns?: PromptAddOn[];
      corePrompt?: DiagnosisCorePromptState | null;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Could not refresh.");
    setPromptAddOns(data.addOns || []);
    if (data.corePrompt && !corePromptDirty) {
      setCorePromptMeta(data.corePrompt);
      setCorePromptDraft(data.corePrompt.body);
    }
  };

  const saveCorePrompt = async () => {
    if (
      !window.confirm(
        "Are you sure you want to change the core system prompt?\n\nThis affects scoring for all new reports. Do not delete existing rules unless you intend to.",
      )
    ) {
      return;
    }
    setCorePromptBusy(true);
    setAddOnError("");
    try {
      const res = await fetch("/api/admin/prompt-addons", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"},
        body: JSON.stringify({ body: corePromptDraft })});
      const data = (await res.json()) as {
        error?: string;
        corePrompt?: DiagnosisCorePromptState;
      };
      if (!res.ok) throw new Error(data.error || "Could not save core prompt.");
      if (data.corePrompt) {
        setCorePromptMeta(data.corePrompt);
        setCorePromptDraft(data.corePrompt.body);
        setCorePromptDirty(false);
      }
    } catch (err) {
      setAddOnError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setCorePromptBusy(false);
    }
  };

  const resetCorePrompt = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset the core prompt to the code default?\n\nYour saved override will be removed.",
      )
    ) {
      return;
    }
    setCorePromptBusy(true);
    setAddOnError("");
    try {
      const res = await fetch("/api/admin/prompt-addons", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"},
        body: JSON.stringify({ reset: true })});
      const data = (await res.json()) as {
        error?: string;
        corePrompt?: DiagnosisCorePromptState;
      };
      if (!res.ok) throw new Error(data.error || "Could not reset core prompt.");
      if (data.corePrompt) {
        setCorePromptMeta(data.corePrompt);
        setCorePromptDraft(data.corePrompt.body);
        setCorePromptDirty(false);
      }
    } catch (err) {
      setAddOnError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setCorePromptBusy(false);
    }
  };

  const createAddOn = async () => {
    if (
      !window.confirm(
        "Add this note to the diagnosis prompt? It will apply to new analyses when enabled.",
      )
    ) {
      return;
    }
    setAddOnBusy(true);
    setAddOnError("");
    try {
      const res = await fetch("/api/admin/prompt-addons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"},
        body: JSON.stringify({
          title: addOnTitle.trim(),
          body: addOnBody.trim(),
          enabled: true})});
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not create add-on.");
      setAddOnTitle("");
      setAddOnBody("");
      await refreshAddOns();
    } catch (err) {
      setAddOnError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setAddOnBusy(false);
    }
  };

  const toggleAddOn = async (id: string, enabled: boolean) => {
    setAddOnError("");
    try {
      const res = await fetch("/api/admin/prompt-addons", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"},
        body: JSON.stringify({ id, enabled })});
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update add-on.");
      await refreshAddOns();
    } catch (err) {
      setAddOnError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const saveEditAddOn = async () => {
    if (!editingAddOnId) return;
    if (!window.confirm("Are you sure you want to save changes to this note?")) {
      return;
    }
    setAddOnBusy(true);
    setAddOnError("");
    try {
      const res = await fetch("/api/admin/prompt-addons", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"},
        body: JSON.stringify({
          id: editingAddOnId,
          title: editTitle.trim(),
          body: editBody.trim()})});
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save add-on.");
      setEditingAddOnId(null);
      await refreshAddOns();
    } catch (err) {
      setAddOnError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setAddOnBusy(false);
    }
  };

  const deleteAddOn = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this prompt add-on?")) {
      return;
    }
    setAddOnError("");
    try {
      const res = await fetch(
        `/api/admin/prompt-addons?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE"},
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete add-on.");
      if (editingAddOnId === id) setEditingAddOnId(null);
      await refreshAddOns();
    } catch (err) {
      setAddOnError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${adminUi.brand}`}>
          EliteSpeak
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-rose-700 sm:text-3xl">
              Diagnosis prompt{" "}
              <span className="text-base font-extrabold uppercase tracking-wide">
                (critical)
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              Core scoring rules and optional add-on notes for new analyses.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clients"
              className="text-sm font-semibold text-teal-700 hover:underline"
            >
              EliteSpeak Clients
            </Link>
            <Link
              href="/admin"
              className="text-sm font-semibold text-teal-700 hover:underline"
            >
              ← Back to admin
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
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void load(password)}
                className="btn-secondary !w-auto px-4"
              >
                {busy ? "Refreshing…" : "Refresh"}
              </button>
              <Link href="/admin" className="btn-secondary !w-auto px-4 no-underline">
                Back to admin
              </Link>
            </div>

            <p className="rounded-xl border-2 border-rose-500 bg-rose-50 px-4 py-3 text-sm font-semibold leading-relaxed text-rose-800">
              Do not change the main prompt or delete any part of the red core
              text unless you are certain. Prefer adding a short note below
              instead. Saving the core prompt affects every new report.
            </p>

            <div className="rounded-2xl border-2 border-rose-500/70 bg-rose-50/80 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-rose-700">
                    Core system prompt
                  </p>
                  <p className="mt-0.5 text-[11px] text-rose-600/90">
                    {corePromptMeta?.isOverride
                      ? `Live override${corePromptMeta.updatedAt ? ` · saved ${formatWhenCompact(corePromptMeta.updatedAt)}` : ""}`
                      : "Using code default (not overridden yet)"}
                    {corePromptDirty ? " · unsaved edits" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCorePrompt((v) => !v)}
                  className="text-sm font-semibold text-rose-700 hover:underline"
                >
                  {showCorePrompt ? "Collapse" : "Expand full prompt"}
                </button>
              </div>
              {showCorePrompt ? (
                <>
                  <textarea
                    value={corePromptDraft}
                    onChange={(e) => {
                      setCorePromptDraft(e.target.value);
                      setCorePromptDirty(true);
                    }}
                    rows={28}
                    spellCheck={false}
                    className="mt-3 w-full rounded-lg border border-rose-300 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-rose-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={corePromptBusy || !corePromptDirty}
                      onClick={() => void saveCorePrompt()}
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-55"
                    >
                      {corePromptBusy ? "Saving…" : "Save core prompt"}
                    </button>
                    <button
                      type="button"
                      disabled={corePromptBusy}
                      onClick={() => void resetCorePrompt()}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-300 bg-white px-5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-55"
                    >
                      Reset to code default
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wide">
                + Add note
              </h2>
              <p className="mt-1 text-sm text-muted">
                Safer than editing the red core. Enabled notes append to new
                analyses only.
              </p>
              <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-muted">
                Short title
              </label>
              <input
                type="text"
                value={addOnTitle}
                onChange={(e) => setAddOnTitle(e.target.value.slice(0, 120))}
                placeholder='Example: "Stricter on fillers for sales calls"'
                className={`mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              />
              <label className="mt-3 block text-xs font-extrabold uppercase tracking-wide text-muted">
                Short note
              </label>
              <textarea
                value={addOnBody}
                onChange={(e) => setAddOnBody(e.target.value.slice(0, 2000))}
                rows={4}
                placeholder={`Example: "When the speaker sounds sales-oriented, penalize filler words (um/uh/you know) more strictly. Keep all other scoring rules the same."`}
                className={`mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              />
              <p className="mt-2 text-xs text-muted">
                Tip: one clear instruction. Don&apos;t paste the whole system
                prompt here.
              </p>
              <button
                type="button"
                disabled={addOnBusy || !addOnTitle.trim() || !addOnBody.trim()}
                onClick={() => void createAddOn()}
                className={`${adminUi.primaryBtn} mt-4`}
              >
                {addOnBusy ? "Saving…" : "+ Add to diagnosis prompt"}
              </button>
              {addOnError ? (
                <p className={`mt-2 text-sm ${adminUi.dangerText}`}>{addOnError}</p>
              ) : null}

              <ul className="mt-6 space-y-3 border-t border-border pt-4">
                {promptAddOns.length === 0 ? (
                  <li className="text-sm text-muted">No add-ons yet.</li>
                ) : (
                  promptAddOns.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-border bg-track/30 p-3"
                    >
                      {editingAddOnId === item.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) =>
                              setEditTitle(e.target.value.slice(0, 120))
                            }
                            className={`w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm ${adminUi.focus}`}
                          />
                          <textarea
                            value={editBody}
                            onChange={(e) =>
                              setEditBody(e.target.value.slice(0, 2000))
                            }
                            rows={3}
                            className={`w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm ${adminUi.focus}`}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={addOnBusy}
                              onClick={() => void saveEditAddOn()}
                              className="text-sm font-bold text-teal-700 hover:underline"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAddOnId(null)}
                              className="text-sm font-semibold text-muted hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-foreground">
                                {item.title}
                                {!item.enabled ? (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                                    Off
                                  </span>
                                ) : (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                    On
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 text-sm text-muted whitespace-pre-wrap">
                                {item.body}
                              </p>
                            </div>
                            <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted">
                              <input
                                type="checkbox"
                                className={adminUi.checkbox}
                                checked={item.enabled}
                                onChange={(e) =>
                                  void toggleAddOn(item.id, e.target.checked)
                                }
                              />
                              Enabled
                            </label>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddOnId(item.id);
                                setEditTitle(item.title);
                                setEditBody(item.body);
                              }}
                              className={`text-sm font-semibold ${adminUi.link}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteAddOn(item.id)}
                              className={`text-sm font-semibold ${adminUi.dangerBtn}`}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
