"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminReadOnly, ViewerReadOnlyBanner } from "@/components/AdminReadOnly";
import { useAdminStaff } from "@/components/AdminShell";
import type { ImportExerciseDraft } from "@/lib/exercise-catalog-import";
import type { CatalogExerciseRow } from "@/lib/workout-exercises";

function dedupeDrafts(drafts: ImportExerciseDraft[]): ImportExerciseDraft[] {
  const seen = new Set<string>();
  return drafts.filter((d) => {
    const slug = (d.slug || d.name).trim().toLowerCase();
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

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
  const [importBusy, setImportBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [problemFilter, setProblemFilter] = useState<string>("all");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importCharCount, setImportCharCount] = useState(0);
  const [importProgress, setImportProgress] = useState("");
  const [showImportText, setShowImportText] = useState(false);
  const [importDrafts, setImportDrafts] = useState<ImportExerciseDraft[]>([]);
  const [importMeta, setImportMeta] = useState<{
    chunkCount: number;
    method: string;
  } | null>(null);
  const [insertOnlyMissing, setInsertOnlyMissing] = useState(false);
  const [warmRag, setWarmRag] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [selectedDraftKeys, setSelectedDraftKeys] = useState<string[]>([]);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);

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

  async function seedCatalog(onlyMissing: boolean) {
    if (!canEdit) return;
    setSeedBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed", insertOnlyMissing: onlyMissing }),
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

  async function parseImport() {
    if (!canEdit || !importText.trim()) return;
    setImportBusy(true);
    setError("");
    setStatus("");
    setImportProgress("Starting parse…");
    try {
      const all: ImportExerciseDraft[] = [];
      let batchIndex = 0;
      let done = false;
      let chunkCount = 0;
      let method = "llm";
      let guard = 0;

      while (!done && guard < 200) {
        guard += 1;
        setImportProgress(
          `Parsing batch ${batchIndex + 1}${chunkCount ? `…` : "…"}`,
        );
        const res = await fetch("/api/admin/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "parseImport",
            text: importText,
            batchIndex,
            batchesPerRequest: 4,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          drafts?: ImportExerciseDraft[];
          chunkCount?: number;
          method?: string;
          batchCount?: number;
          done?: boolean;
          nextBatchIndex?: number;
        };
        if (!res.ok) throw new Error(data.error || "Parse failed.");

        all.push(...(data.drafts || []));
        chunkCount = data.chunkCount ?? chunkCount;
        method = data.method ?? method;
        const batchCount = data.batchCount ?? 1;
        setImportProgress(
          `Parsed batch ${Math.min(batchIndex + 1, batchCount)} of ${batchCount} (${all.length} drills so far)…`,
        );
        done = data.done === true;
        batchIndex = data.nextBatchIndex ?? batchIndex + 1;
        if (done) break;
      }

      const unique = dedupeDrafts(all);
      setImportDrafts(unique);
      setSelectedDraftKeys([]);
      setImportMeta({ chunkCount, method });
      setImportProgress("");
      setStatus(
        `Parsed ${unique.length} exercises from ${chunkCount} chunks (${method}). Edit below, then import.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed.");
      setImportProgress("");
    } finally {
      setImportBusy(false);
    }
  }

  async function confirmImport() {
    if (!canEdit || importDrafts.length === 0) return;
    setImportBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmImport",
          drafts: importDrafts,
          insertOnlyMissing,
          warmRag,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        inserted?: number;
        updated?: number;
        skipped?: number;
        warmed?: boolean;
        catalogCount?: number;
        exercises?: CatalogExerciseRow[];
      };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      if (data.exercises) setExercises(data.exercises);
      else await load();
      setImportDrafts([]);
      setImportMeta(null);
      setImportText("");
      setImportFileName("");
      setImportCharCount(0);
      setStatus(
        `Imported: ${data.inserted ?? 0} new, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped.` +
          (data.warmed
            ? ` RAG re-embedded ${data.catalogCount ?? 0} drills.`
            : " RAG cache cleared — next Generate tasks will re-embed."),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  function applyLoadedText(text: string, fileName: string) {
    setImportText(text);
    setImportFileName(fileName);
    setImportCharCount(text.length);
    setShowImport(true);
    setShowImportText(text.length < 40_000);
    setImportDrafts([]);
    setImportMeta(null);
    setStatus(
      `Loaded ${fileName || "text"} · ${text.length.toLocaleString()} characters. Click Parse into drafts.`,
    );
  }

  async function onImportFile(file: File | null) {
    if (!file || !canEdit) return;
    setImportBusy(true);
    setError("");
    setStatus("");
    setImportProgress(`Reading ${file.name}…`);
    try {
      const lower = file.name.toLowerCase();
      const isPdf =
        file.type === "application/pdf" || lower.endsWith(".pdf");

      if (isPdf) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/exercises/import-file", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          error?: string;
          text?: string;
          fileName?: string;
          charCount?: number;
          truncated?: boolean;
        };
        if (!res.ok) throw new Error(data.error || "Could not read file.");
        applyLoadedText(data.text || "", data.fileName || file.name);
        if (data.truncated) {
          setStatus(
            (s) =>
              `${s} (hit the character cap — split the doc if drills are missing at the end.)`,
          );
        }
      } else {
        // .txt / .md / .json — read fully in the browser (full 84-page bible OK)
        const text = await file.text();
        applyLoadedText(text.slice(0, 750_000), file.name);
        if (text.length > 750_000) {
          setStatus(
            (s) =>
              `${s} (truncated to 750k chars — split the remaining pages into a second upload.)`,
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file.");
    } finally {
      setImportBusy(false);
      setImportProgress("");
    }
  }

  function updateImportDraft(
    key: string,
    patch: Partial<ImportExerciseDraft>,
  ) {
    setImportDrafts((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeImportDraft(key: string) {
    setImportDrafts((rows) => rows.filter((row) => row.key !== key));
    setSelectedDraftKeys((keys) => keys.filter((k) => k !== key));
  }

  function toggleDraftSelected(key: string) {
    setSelectedDraftKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  }

  function selectAllDrafts() {
    setSelectedDraftKeys(importDrafts.map((d) => d.key));
  }

  function clearDraftSelection() {
    setSelectedDraftKeys([]);
  }

  function removeSelectedDrafts() {
    if (selectedDraftKeys.length === 0) return;
    const drop = new Set(selectedDraftKeys);
    setImportDrafts((rows) => rows.filter((row) => !drop.has(row.key)));
    setSelectedDraftKeys([]);
  }

  function clearAllDrafts() {
    setImportDrafts([]);
    setImportMeta(null);
    setSelectedDraftKeys([]);
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
      setStatus("Saved. RAG cache will refresh on next retrieve.");
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
      setSelectedCatalogIds((ids) => ids.filter((id) => id !== row.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function deleteSelectedCatalog() {
    if (!canEdit || selectedCatalogIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedCatalogIds.length} selected exercise${selectedCatalogIds.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeMany",
          ids: selectedCatalogIds,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        deleted?: number;
        exercises?: CatalogExerciseRow[];
      };
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      setSelectedCatalogIds([]);
      if (data.exercises) setExercises(data.exercises);
      else await load();
      setStatus(`Deleted ${data.deleted ?? 0} exercises.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAllCatalog() {
    if (!canEdit || exercises.length === 0) return;
    if (
      !window.confirm(
        `Delete ALL ${exercises.length} exercises in the catalog? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeMany", all: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        deleted?: number;
        exercises?: CatalogExerciseRow[];
      };
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      setSelectedCatalogIds([]);
      if (data.exercises) setExercises(data.exercises);
      else await load();
      setStatus(`Deleted all exercises (${data.deleted ?? 0}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCatalogSelected(id: string) {
    setSelectedCatalogIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  const filteredIds = filtered.map((ex) => ex.id);
  const allFilteredSelected =
    filteredIds.length > 0 &&
    filteredIds.every((id) => selectedCatalogIds.includes(id));

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedCatalogIds((ids) =>
        ids.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      setSelectedCatalogIds((ids) => [
        ...new Set([...ids, ...filteredIds]),
      ]);
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
            Live catalog for transcript matching. Paste a doc to ingest many
            drills at once, edit them, then import — RAG re-embeds after save.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminReadOnly canEdit={canEdit}>
            <button
              type="button"
              className={adminUi.secondaryBtn}
              disabled={!canEdit}
              onClick={() => setShowImport((v) => !v)}
            >
              {showImport ? "Hide import" : "Import from text"}
            </button>
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

      {showImport ? (
        <AdminReadOnly canEdit={canEdit}>
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Import from text
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Upload the full Problem Bible as PDF or Plain Text (.txt). We
              extract everything (up to ~750k characters / ~84+ pages), parse in
              batches so nothing times out, then you edit before save.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className={`${adminUi.secondaryBtn} cursor-pointer`}>
                Upload PDF or .txt
                <input
                  type="file"
                  accept=".txt,.md,.json,.pdf,text/plain,application/pdf,application/json"
                  className="hidden"
                  disabled={importBusy || !canEdit}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    void onImportFile(f);
                  }}
                />
              </label>
              {importFileName ? (
                <p className="text-sm font-semibold text-slate-700">
                  {importFileName}
                  {importCharCount
                    ? ` · ${importCharCount.toLocaleString()} chars`
                    : ""}
                </p>
              ) : null}
            </div>
            {importProgress ? (
              <p className="mt-3 text-sm font-semibold text-teal-800">
                {importProgress}
              </p>
            ) : null}
            {importCharCount > 40_000 ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-600">
                  Full doc is loaded in memory (not shown in the box — too large
                  to edit as one paste).
                </p>
                <button
                  type="button"
                  className={adminUi.secondaryBtn}
                  onClick={() => setShowImportText((v) => !v)}
                >
                  {showImportText ? "Hide text preview" : "Show text preview"}
                </button>
              </div>
            ) : null}
            {showImportText || importCharCount <= 40_000 ? (
              <textarea
                value={importText}
                onChange={(e) => {
                  const next = e.target.value.slice(0, 750_000);
                  setImportText(next);
                  setImportCharCount(next.length);
                  if (!importFileName) setImportFileName("pasted-text");
                }}
                rows={importCharCount > 40_000 ? 8 : 10}
                placeholder="Or paste exercises here…"
                className={`mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-[13px] leading-relaxed ${adminUi.focus}`}
              />
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className={adminUi.primaryBtn}
                disabled={importBusy || !importText.trim() || !canEdit}
                onClick={() => void parseImport()}
              >
                {importBusy ? "Working…" : "Parse into drafts"}
              </button>
              {importMeta ? (
                <p className="text-sm text-slate-500">
                  {importDrafts.length} drafts · {importMeta.chunkCount} chunks ·{" "}
                  {importMeta.method}
                </p>
              ) : null}
            </div>

            {importDrafts.length > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={insertOnlyMissing}
                      onChange={(e) => setInsertOnlyMissing(e.target.checked)}
                      className="accent-teal-600"
                    />
                    Skip existing slugs
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={warmRag}
                      onChange={(e) => setWarmRag(e.target.checked)}
                      className="accent-teal-600"
                    />
                    Re-embed RAG now
                  </label>
                  <button
                    type="button"
                    className={adminUi.primaryBtn}
                    disabled={importBusy || !canEdit}
                    onClick={() => void confirmImport()}
                  >
                    {importBusy
                      ? "Importing…"
                      : `Import ${importDrafts.length} exercises`}
                  </button>
                  <button
                    type="button"
                    className={adminUi.secondaryBtn}
                    onClick={() => clearAllDrafts()}
                  >
                    Clear all drafts
                  </button>
                  <button
                    type="button"
                    className={adminUi.secondaryBtn}
                    disabled={importDrafts.length === 0}
                    onClick={() =>
                      selectedDraftKeys.length === importDrafts.length
                        ? clearDraftSelection()
                        : selectAllDrafts()
                    }
                  >
                    {selectedDraftKeys.length === importDrafts.length &&
                    importDrafts.length > 0
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                  <button
                    type="button"
                    className={adminUi.dangerBtn}
                    disabled={selectedDraftKeys.length === 0}
                    onClick={() => removeSelectedDrafts()}
                  >
                    Remove selected ({selectedDraftKeys.length})
                  </button>
                </div>

                <ul className="space-y-3">
                  {importDrafts.map((row, index) => (
                    <li
                      key={row.key}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          <input
                            type="checkbox"
                            checked={selectedDraftKeys.includes(row.key)}
                            onChange={() => toggleDraftSelected(row.key)}
                            className="accent-teal-600"
                          />
                          Draft {index + 1}
                          {row.sourceChunk != null
                            ? ` · chunk ${row.sourceChunk + 1}`
                            : ""}
                        </label>
                        <button
                          type="button"
                          className={adminUi.dangerBtn}
                          onClick={() => removeImportDraft(row.key)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <label className="block text-sm">
                          <span className="font-semibold text-slate-700">Name</span>
                          <input
                            value={row.name}
                            onChange={(e) =>
                              updateImportDraft(row.key, {
                                name: e.target.value.slice(0, 160),
                              })
                            }
                            className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 ${adminUi.focus}`}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-semibold text-slate-700">Slug</span>
                          <input
                            value={row.slug}
                            onChange={(e) =>
                              updateImportDraft(row.key, {
                                slug: e.target.value.slice(0, 80),
                              })
                            }
                            className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-[13px] ${adminUi.focus}`}
                          />
                        </label>
                        <label className="block text-sm md:col-span-2">
                          <span className="font-semibold text-slate-700">Purpose</span>
                          <textarea
                            value={row.purpose}
                            onChange={(e) =>
                              updateImportDraft(row.key, {
                                purpose: e.target.value.slice(0, 2000),
                              })
                            }
                            rows={2}
                            className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 ${adminUi.focus}`}
                          />
                        </label>
                        <label className="block text-sm md:col-span-2">
                          <span className="font-semibold text-slate-700">
                            Instructions
                          </span>
                          <textarea
                            value={row.instructions}
                            onChange={(e) =>
                              updateImportDraft(row.key, {
                                instructions: e.target.value.slice(0, 12_000),
                              })
                            }
                            rows={5}
                            className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-[13px] ${adminUi.focus}`}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-semibold text-slate-700">
                            When to use
                          </span>
                          <textarea
                            value={row.whenToUse}
                            onChange={(e) =>
                              updateImportDraft(row.key, {
                                whenToUse: e.target.value.slice(0, 2000),
                              })
                            }
                            rows={2}
                            className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 ${adminUi.focus}`}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-semibold text-slate-700">
                            Tags (comma)
                          </span>
                          <input
                            value={row.tags.join(", ")}
                            onChange={(e) =>
                              updateImportDraft(row.key, {
                                tags: e.target.value
                                  .split(/[,;\n]+/)
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              })
                            }
                            className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 ${adminUi.focus}`}
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </AdminReadOnly>
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
          <button
            type="button"
            className={adminUi.secondaryBtn}
            disabled={!canEdit || filtered.length === 0}
            onClick={() => toggleSelectAllFiltered()}
          >
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </button>
          <button
            type="button"
            className={adminUi.dangerBtn}
            disabled={!canEdit || selectedCatalogIds.length === 0 || busy}
            onClick={() => void deleteSelectedCatalog()}
          >
            Delete selected ({selectedCatalogIds.length})
          </button>
          <button
            type="button"
            className={adminUi.dangerBtn}
            disabled={!canEdit || exercises.length === 0 || busy}
            onClick={() => void deleteAllCatalog()}
          >
            Delete all
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
                ? "Catalog is empty. Seed the Problem Bible or import from text."
                : "No exercises match this filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((ex) => (
              <li key={ex.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <AdminReadOnly canEdit={canEdit}>
                      <input
                        type="checkbox"
                        checked={selectedCatalogIds.includes(ex.id)}
                        onChange={() => toggleCatalogSelected(ex.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-teal-600"
                        aria-label={`Select ${ex.name}`}
                      />
                    </AdminReadOnly>
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{ex.name}</p>
                      {!ex.enabled ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          Off
                        </span>
                      ) : (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-800">
                          Enabled
                        </span>
                      )}
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
