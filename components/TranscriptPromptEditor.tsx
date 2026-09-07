"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminReadOnly } from "@/components/AdminReadOnly";
import {
  TRANSCRIPT_PROMPT_DEFAULTS,
  TRANSCRIPT_PROMPT_TOKEN_HELP,
  type TranscriptPromptKey,
  type TranscriptPromptState,
} from "@/lib/transcript-prompts";

const FIELDS: Array<{
  key: TranscriptPromptKey;
  label: string;
  description: string;
}> = [
  {
    key: "shared",
    label: "Shared prompt",
    description: "Used for every transcript run — client context and overall tone.",
  },
  {
    key: "summary",
    label: "Summary prompt",
    description: "How the meeting recap is written for the client.",
  },
  {
    key: "tasks",
    label: "Task prompt",
    description:
      "How lesson tasks are drafted. The default always creates tasks from the exercise catalog.",
  },
];

function defaultState(): TranscriptPromptState {
  return {
    shared: {
      body: TRANSCRIPT_PROMPT_DEFAULTS.shared,
      isOverride: false,
      updatedAt: null,
      codeDefault: TRANSCRIPT_PROMPT_DEFAULTS.shared,
    },
    summary: {
      body: TRANSCRIPT_PROMPT_DEFAULTS.summary,
      isOverride: false,
      updatedAt: null,
      codeDefault: TRANSCRIPT_PROMPT_DEFAULTS.summary,
    },
    tasks: {
      body: TRANSCRIPT_PROMPT_DEFAULTS.tasks,
      isOverride: false,
      updatedAt: null,
      codeDefault: TRANSCRIPT_PROMPT_DEFAULTS.tasks,
    },
  };
}

function formatWhenCompact(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TranscriptPromptEditor({
  canEdit,
  compact = false,
}: {
  canEdit: boolean;
  compact?: boolean;
}) {
  const [prompts, setPrompts] = useState<TranscriptPromptState>(defaultState);
  const [drafts, setDrafts] = useState({
    shared: TRANSCRIPT_PROMPT_DEFAULTS.shared,
    summary: TRANSCRIPT_PROMPT_DEFAULTS.summary,
    tasks: TRANSCRIPT_PROMPT_DEFAULTS.tasks,
  });
  const [dirty, setDirty] = useState({
    shared: false,
    summary: false,
    tasks: false,
  });
  const [busyKey, setBusyKey] = useState<TranscriptPromptKey | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#transcript-prompts") {
      document.getElementById("transcript-prompts")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const apply = useCallback((next: TranscriptPromptState) => {
    setPrompts(next);
    setDrafts({
      shared: next.shared.body,
      summary: next.summary.body,
      tasks: next.tasks.body,
    });
    setDirty({ shared: false, summary: false, tasks: false });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/transcript-prompts");
        const data = (await res.json()) as {
          prompts?: TranscriptPromptState | null;
          error?: string;
        };
        if (!res.ok || !data.prompts) return;
        if (!cancelled) apply(data.prompts);
      } catch {
        // Keep code defaults visible so the editor still appears.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  async function save(key: TranscriptPromptKey) {
    const label = FIELDS.find((field) => field.key === key)?.label ?? "prompt";
    if (
      !window.confirm(
        `Save the ${label.toLowerCase()}?\n\nNew transcript summaries and tasks will use this immediately.`,
      )
    ) {
      return;
    }
    setBusyKey(key);
    setError("");
    try {
      const res = await fetch("/api/admin/transcript-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, body: drafts[key] }),
      });
      const data = (await res.json()) as {
        error?: string;
        prompts?: TranscriptPromptState;
      };
      if (!res.ok) throw new Error(data.error || "Could not save prompt.");
      if (data.prompts) apply(data.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function reset(key: TranscriptPromptKey) {
    const label = FIELDS.find((field) => field.key === key)?.label ?? "prompt";
    if (
      !window.confirm(
        `Reset the ${label.toLowerCase()} to the code default?`,
      )
    ) {
      return;
    }
    setBusyKey(key);
    setError("");
    try {
      const res = await fetch("/api/admin/transcript-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, reset: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        prompts?: TranscriptPromptState;
      };
      if (!res.ok) throw new Error(data.error || "Could not reset prompt.");
      if (data.prompts) apply(data.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section
      id="transcript-prompts"
      className="scroll-mt-28 rounded-2xl border-2 border-teal-300 bg-teal-50/70 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-800">
            Edit transcript prompts
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            Change the live prompts used to summarize the call and assign tasks.
            Saves apply immediately.
          </p>
        </div>
        {compact ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-teal-300 bg-white px-4 text-sm font-bold text-teal-800"
          >
            {open ? "Hide prompts" : "Show prompts"}
          </button>
        ) : null}
      </div>

      {open ? (
        <>
          <div className="mt-4 rounded-xl border border-teal-100 bg-white/90 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-teal-700">
              Available tokens
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRANSCRIPT_PROMPT_TOKEN_HELP.map((token) => (
                <code
                  key={token}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                >
                  {token}
                </code>
              ))}
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>
          ) : null}

          <div className="mt-4 space-y-4">
            {FIELDS.map((field) => {
              const meta = prompts[field.key];
              const busy = busyKey === field.key;
              return (
                <div
                  key={field.key}
                  className="rounded-2xl border border-teal-100 bg-white p-4"
                >
                  <p className="text-sm font-extrabold text-slate-900">
                    {field.label}
                  </p>
                  <p className="mt-1 text-sm text-muted">{field.description}</p>
                  <p className="mt-1 text-[11px] text-teal-700">
                    {meta.isOverride
                      ? `Live override${meta.updatedAt ? ` · saved ${formatWhenCompact(meta.updatedAt)}` : ""}`
                      : "Using code default"}
                    {dirty[field.key] ? " · unsaved edits" : ""}
                  </p>
                  <textarea
                    value={drafts[field.key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDrafts((prev) => ({ ...prev, [field.key]: value }));
                      setDirty((prev) => ({ ...prev, [field.key]: true }));
                    }}
                    readOnly={!canEdit}
                    rows={compact ? 6 : field.key === "shared" ? 10 : 8}
                    spellCheck={false}
                    className="mt-3 w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                  <AdminReadOnly canEdit={canEdit}>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !dirty[field.key]}
                        onClick={() => void save(field.key)}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-55"
                      >
                        {busy ? "Saving…" : "Save prompt"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void reset(field.key)}
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-teal-200 bg-white px-5 text-sm font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-55"
                      >
                        Reset to code default
                      </button>
                    </div>
                  </AdminReadOnly>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
