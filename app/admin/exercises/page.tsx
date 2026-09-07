"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminReadOnly, ViewerReadOnlyBanner } from "@/components/AdminReadOnly";
import { useAdminStaff } from "@/components/AdminShell";
import type { CatalogExerciseRow } from "@/lib/workout-exercises";

const adminUi = {
  brand: "text-teal-700",
  link: "text-teal-700 hover:text-teal-900",
  focus: "focus:border-teal-500 focus:ring-teal-500/20",
  primaryBtn:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-55",
  secondaryBtn:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-55",
  dangerBtn: "text-rose-700 hover:text-rose-900 text-sm font-semibold",
} as const;

type Draft = {
  id?: string;
  slug: string;
  name: string;
  purpose: string;
  problemItSolves: string;
  instructions: string;
  whenToUse: string;
  tags: string;
  timing: string;
  timingMinutes: string;
  problemNumber: string;
  problemTitle: string;
  exerciseIndex: string;
  timelineSummary: string;
  enabled: boolean;
};

function emptyDraft(): Draft {
  return {
    slug: "",
    name: "",
    purpose: "",
    problemItSolves: "",
    instructions: "",
    whenToUse: "",
    tags: "",
    timing: "10-15 minutes daily",
    timingMinutes: "12",
    problemNumber: "",
    problemTitle: "",
    exerciseIndex: "1",
    timelineSummary: "",
    enabled: true,
  };
}

function rowToDraft(row: CatalogExerciseRow): Draft {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    purpose: row.purpose,
    problemItSolves: row.problemItSolves,
    instructions: row.instructions,
    whenToUse: row.whenToUse,
    tags: row.tags.join(", "),
    timing: row.timing,
    timingMinutes:
      row.timingMinutes != null ? String(row.timingMinutes) : "",
    problemNumber:
      row.problemNumber != null ? String(row.problemNumber) : "",
    problemTitle: row.problemTitle ?? "",
    exerciseIndex:
      row.exerciseIndex != null ? String(row.exerciseIndex) : "1",
    timelineSummary: row.timelineSummary ?? "",
    enabled: row.enabled,
  };
}

export default function AdminExercisesPage() {
  const { canEdit } = useAdminStaff();
  const [exercises, setExercises] = useState<CatalogExerciseRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [problemFilter, setProblemFilter] = useState<string>("all");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/exercises");
      const data = (await res.json()) as {
        error?: string;
        exercises?: CatalogExerciseRow[];
      };
      if (!res.ok) throw new Error(data.error || "Failed to load exercises.");
      setExercises(data.exercises || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const problemOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const ex of exercises) {
      if (ex.problemNumber != null && ex.problemTitle) {
        map.set(ex.problemNumber, ex.problemTitle);
      }
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (problemFilter !== "all") {
        if (String(ex.problemNumber) !== problemFilter) return false;
      }
      if (!q) return true;
      const hay = [
        ex.slug,
        ex.name,
        ex.purpose,
        ex.whenToUse,
        ex.problemTitle,
        ex.tags.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [exercises, query, problemFilter]);

  async function seedCatalog(insertOnlyMissing: boolean) {
    if (!canEdit) return;
    setSeedBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed", insertOnlyMissing }),
      });
      const data = (await res.json()) as {
        error?: string;
        inserted?: number;
        updated?: number;
        skipped?: number;
        exercises?: CatalogExerciseRow[];
      };
      if (!res.ok) throw new Error(data.error || "Seed failed.");
      if (data.exercises) setExercises(data.exercises);
      else await load();
      setStatus(
        `Seeded: ${data.inserted ?? 0} inserted, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed.");
    } finally {
      setSeedBusy(false);
    }
  }

  async function saveDraft() {
    if (!canEdit) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const tags = draft.tags
        .split(/[,;\n]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          id: draft.id,
          slug: draft.slug,
          name: draft.name,
          purpose: draft.purpose,
          problemItSolves: draft.problemItSolves,
          instructions: draft.instructions,
          whenToUse: draft.whenToUse,
          tags,
          timing: draft.timing,
          timingMinutes: draft.timingMinutes
            ? Number(draft.timingMinutes)
            : undefined,
          problemNumber: draft.problemNumber
            ? Number(draft.problemNumber)
            : undefined,
          problemTitle: draft.problemTitle || undefined,
          exerciseIndex: draft.exerciseIndex
            ? Number(draft.exerciseIndex)
            : undefined,
          timelineSummary: draft.timelineSummary || undefined,
          enabled: draft.enabled,
          source: draft.id ? undefined : "coach",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setStatus("Saved.");
      setEditing(false);
      setDraft(emptyDraft());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(row: CatalogExerciseRow) {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setEnabled",
          id: row.id,
          enabled: !row.enabled,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function removeRow(row: CatalogExerciseRow) {
    if (!canEdit) return;
    if (!window.confirm(`Delete “${row.name}”?`)) return;
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id: row.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.16em] ${adminUi.brand}`}>
            Exercise catalog
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Communication Problem Bible
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Live catalog for transcript matching. Add or edit a drill here and
            the next Generate tasks run retrieves against this list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminReadOnly canEdit={canEdit}>
            <button
              type="button"
              className={adminUi.secondaryBtn}
              disabled={seedBusy || !canEdit}
              onClick={() => void seedCatalog(true)}
            >
              {seedBusy ? "Seeding…" : "Seed missing only"}
            </button>
            <button
              type="button"
              className={adminUi.primaryBtn}
              disabled={seedBusy || !canEdit}
              onClick={() => {
                if (
                  !window.confirm(
                    "Overwrite all Problem Bible exercises with the seed catalog? Coach edits on matching slugs will be replaced.",
                  )
                ) {
                  return;
                }
                void seedCatalog(false);
              }}
            >
              {seedBusy ? "Seeding…" : "Reseed full Bible"}
            </button>
          </AdminReadOnly>
        </div>
      </div>

      <ViewerReadOnlyBanner canEdit={canEdit} />

      {error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {status}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, tag, problem…"
          className={`min-h-11 min-w-[16rem] flex-1 rounded-xl border border-slate-300 px-4 text-sm ${adminUi.focus}`}
        />
        <select
          value={problemFilter}
          onChange={(e) => setProblemFilter(e.target.value)}
          className={`min-h-11 rounded-xl border border-slate-300 px-3 text-sm ${adminUi.focus}`}
        >
          <option value="all">All problems ({exercises.length})</option>
          {problemOptions.map(([num, title]) => (
            <option key={num} value={String(num)}>
              {String(num).padStart(2, "0")}. {title}
            </option>
          ))}
        </select>
        <AdminReadOnly canEdit={canEdit}>
          <button
            type="button"
            className={adminUi.secondaryBtn}
            disabled={!canEdit}
            onClick={() => {
              setDraft(emptyDraft());
              setEditing(true);
            }}
          >
            Add exercise
          </button>
        </AdminReadOnly>
      </div>

      {editing ? (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            {draft.id ? "Edit exercise" : "New exercise"}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(
              [
                ["slug", "Slug (stable id)", "p01-e1-example"],
                ["name", "Name", "The I Believe That Drill"],
                ["timing", "Timing", "10-15 minutes daily"],
                ["timingMinutes", "Timing minutes", "12"],
                ["problemNumber", "Problem #", "1"],
                ["exerciseIndex", "Exercise index", "1"],
                ["problemTitle", "Problem title", "I Take Too Long…"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label key={key} className="block text-sm">
                <span className="font-semibold text-slate-700">{label}</span>
                <input
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 ${adminUi.focus}`}
                />
              </label>
            ))}
            <label className="block text-sm md:col-span-2">
              <span className="font-semibold text-slate-700">Tags (comma-separated)</span>
              <input
                value={draft.tags}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tags: e.target.value }))
                }
                className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 ${adminUi.focus}`}
              />
            </label>
            {(
              [
                ["purpose", "Purpose"],
                ["problemItSolves", "Problem it solves"],
                ["whenToUse", "When to use"],
                ["timelineSummary", "Timeline summary"],
                ["instructions", "Instructions"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">{label}</span>
                <textarea
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [key]: e.target.value }))
                  }
                  rows={key === "instructions" ? 12 : 3}
                  className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-[13px] leading-relaxed ${adminUi.focus}`}
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, enabled: e.target.checked }))
                }
                className="accent-teal-600"
              />
              Enabled for retrieval
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={adminUi.primaryBtn}
              disabled={busy || !canEdit}
              onClick={() => void saveDraft()}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={adminUi.secondaryBtn}
              onClick={() => {
                setEditing(false);
                setDraft(emptyDraft());
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {busy && exercises.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">Loading catalog…</p>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-600">
              {exercises.length === 0
                ? "Catalog is empty. Seed the Problem Bible to load all 70 drills."
                : "No exercises match this filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((ex) => (
              <li key={ex.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{ex.name}</p>
                      {!ex.enabled ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          Off
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {ex.slug}
                      {ex.problemNumber != null
                        ? ` · P${String(ex.problemNumber).padStart(2, "0")} E${ex.exerciseIndex ?? "?"}`
                        : ""}
                      {ex.timing ? ` · ${ex.timing}` : ""}
                    </p>
                    {ex.problemTitle ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {ex.problemTitle}
                      </p>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {ex.purpose}
                    </p>
                    {ex.tags.length > 0 ? (
                      <p className="mt-2 text-xs text-slate-400">
                        {ex.tags.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <AdminReadOnly canEdit={canEdit}>
                      <button
                        type="button"
                        className={adminUi.link + " text-sm font-semibold"}
                        onClick={() => {
                          setDraft(rowToDraft(ex));
                          setEditing(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={adminUi.link + " text-sm font-semibold"}
                        onClick={() => void toggleEnabled(ex)}
                      >
                        {ex.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className={adminUi.dangerBtn}
                        onClick={() => void removeRow(ex)}
                      >
                        Delete
                      </button>
                    </AdminReadOnly>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
