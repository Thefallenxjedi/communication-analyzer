"use client";

import { useCallback, useEffect, useState } from "react";
import { FINAL_SESSION, INTRO_SESSION, sessionLabel } from "@/lib/coaching-program";
import type { CoachingTask } from "@/lib/coaching-tasks";
import type { CoachingSessionSlot } from "@/lib/coaching-sessions";
import type { GeneratedWorkoutTask } from "@/lib/transcript-to-workout";
import type { SessionRecap } from "@/lib/session-recap";

type DraftTask = GeneratedWorkoutTask & { key: string };

function emptyTask(): DraftTask {
  return {
    key: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    exerciseId: "pre-speak-routine",
    title: "",
    instructions: "",
    recordingRequired: false,
    reviewRequired: false,
  };
}

export function TranscriptToWorkoutPanel({
  clientId,
  targetSessionNumber,
  password,
  onSaved,
}: {
  clientId: string;
  targetSessionNumber: number;
  password: string;
  sessionLocked?: boolean;
  onSaved: (data: {
    tasks?: CoachingTask[];
    sessions?: CoachingSessionSlot[];
  }) => void | Promise<void>;
}) {
  const defaultSource =
    targetSessionNumber > 1 ? targetSessionNumber - 1 : 1;

  const [transcript, setTranscript] = useState("");
  const [sourceSession, setSourceSession] = useState(defaultSource);
  const [targetSession, setTargetSession] = useState(targetSessionNumber);
  const [generatingRecap, setGeneratingRecap] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [savingRecap, setSavingRecap] = useState(false);
  const [savingTasks, setSavingTasks] = useState(false);
  const [error, setError] = useState("");
  const [recapDraft, setRecapDraft] = useState("");
  const [showRecapEditor, setShowRecapEditor] = useState(false);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [workspaceRecap, setWorkspaceRecap] = useState<SessionRecap | null>(null);

  const loadWorkspaceRecap = useCallback(async () => {
    if (!password || targetSessionNumber < 1) return;
    try {
      const res = await fetch(
        `/api/admin/session-recap?clientId=${encodeURIComponent(clientId)}&session=${targetSessionNumber}`,
        { headers: { "x-admin-password": password } },
      );
      const data = (await res.json()) as { recap?: SessionRecap | null };
      setWorkspaceRecap(data.recap ?? null);
    } catch {
      setWorkspaceRecap(null);
    }
  }, [clientId, password, targetSessionNumber]);

  const loadSourceRecap = useCallback(async () => {
    if (!password || sourceSession < 1) return;
    try {
      const res = await fetch(
        `/api/admin/session-recap?clientId=${encodeURIComponent(clientId)}&session=${sourceSession}`,
        { headers: { "x-admin-password": password } },
      );
      const data = (await res.json()) as { recap?: SessionRecap | null };
      if (data.recap?.recapSummary && sourceSession !== targetSessionNumber) {
        return data.recap;
      }
      return null;
    } catch {
      return null;
    }
  }, [clientId, password, sourceSession, targetSessionNumber]);

  useEffect(() => {
    setSourceSession(targetSessionNumber > 1 ? targetSessionNumber - 1 : 1);
    setTargetSession(targetSessionNumber);
  }, [targetSessionNumber]);

  useEffect(() => {
    void loadWorkspaceRecap();
  }, [loadWorkspaceRecap]);

  async function onCreateSummary() {
    if (!transcript.trim()) {
      setError("Paste a transcript first.");
      return;
    }
    setGeneratingRecap(true);
    setError("");
    try {
      const res = await fetch("/api/admin/transcript-to-workout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          clientId,
          transcript,
          sourceSessionNumber: sourceSession,
          targetSessionNumber: targetSession,
          mode: "recap",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        draft?: { sessionRecap: string };
      };
      if (!res.ok) throw new Error(data.error || "Could not generate summary.");
      setRecapDraft(data.draft?.sessionRecap ?? "");
      setShowRecapEditor(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed.");
    } finally {
      setGeneratingRecap(false);
    }
  }

  async function onSaveSummary() {
    if (!recapDraft.trim()) {
      setError("Summary is empty.");
      return;
    }
    const existing = await loadSourceRecap();
    if (
      existing?.recapSummary &&
      !window.confirm(
        `${sessionLabel(sourceSession)} already has a summary. Replace it?`,
      )
    ) {
      return;
    }
    setSavingRecap(true);
    setError("");
    try {
      const res = await fetch("/api/admin/session-recap", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          clientId,
          sessionNumber: sourceSession,
          recapSummary: recapDraft.trim(),
          sourceTranscript: transcript.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save summary.");
      setShowRecapEditor(false);
      setRecapDraft("");
      if (sourceSession === targetSessionNumber) {
        void loadWorkspaceRecap();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingRecap(false);
    }
  }

  async function onGenerateTasks() {
    if (!transcript.trim()) {
      setError("Paste a transcript first.");
      return;
    }
    setGeneratingTasks(true);
    setError("");
    try {
      const res = await fetch("/api/admin/transcript-to-workout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          clientId,
          transcript,
          sourceSessionNumber: sourceSession,
          targetSessionNumber: targetSession,
          mode: "tasks",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        draft?: { tasks: GeneratedWorkoutTask[] };
      };
      if (!res.ok) throw new Error(data.error || "Could not generate tasks.");
      setDraftTasks(
        (data.draft?.tasks ?? []).map((task) => ({
          ...task,
          key: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      );
      setShowTaskEditor(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed.");
    } finally {
      setGeneratingTasks(false);
    }
  }

  async function onAddTasks() {
    if (draftTasks.length === 0) {
      setError("Add at least one task.");
      return;
    }
    setSavingTasks(true);
    setError("");
    try {
      let lastData: {
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      } = {};

      for (const task of draftTasks) {
        if (!task.title.trim() || !task.instructions.trim()) continue;
        const res = await fetch("/api/admin/tasks", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({
            clientId,
            sessionNumber: targetSession,
            title: task.title.trim(),
            instructions: task.instructions.trim(),
            recordingRequired: task.recordingRequired,
            reviewRequired: task.reviewRequired,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          tasks?: CoachingTask[];
          sessions?: CoachingSessionSlot[];
        };
        if (!res.ok) throw new Error(data.error || "Could not create task.");
        lastData = data;
      }

      await onSaved(lastData);
      setShowTaskEditor(false);
      setDraftTasks([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingTasks(false);
    }
  }

  if (
    targetSessionNumber === INTRO_SESSION ||
    targetSessionNumber >= FINAL_SESSION
  ) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-800">
          Transcript → workout
        </p>
        <p className="mt-1 text-sm text-muted">
          Paste the call transcript below. Create a client-visible summary for one
          session and lesson tasks for another — separately.
        </p>
      </div>

      {workspaceRecap?.recapSummary && !showRecapEditor ? (
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">
              {sessionLabel(targetSessionNumber)} summary (client-visible)
            </p>
            <button
              type="button"
              onClick={() => {
                setRecapDraft(workspaceRecap.recapSummary);
                setSourceSession(targetSessionNumber);
                setShowRecapEditor(true);
              }}
              className="text-sm font-semibold text-teal-800"
            >
              Edit
            </button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {workspaceRecap.recapSummary}
          </p>
        </div>
      ) : null}

      <label className="block text-sm font-semibold">
        Google Meet transcript
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={6}
          placeholder="Paste transcript here…"
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Summary for
          <select
            value={sourceSession}
            onChange={(e) => setSourceSession(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {sessionLabel(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Tasks for
          <select
            value={targetSession}
            onChange={(e) => setTargetSession(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {sessionLabel(n)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={generatingRecap || !transcript.trim()}
          onClick={() => void onCreateSummary()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white disabled:opacity-55"
        >
          {generatingRecap ? "Creating…" : "Create summary"}
        </button>
        <button
          type="button"
          disabled={generatingTasks || !transcript.trim()}
          onClick={() => void onGenerateTasks()}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-700 bg-white px-5 text-sm font-bold text-teal-800 disabled:opacity-55"
        >
          {generatingTasks ? "Generating…" : "Generate tasks"}
        </button>
      </div>

      {showRecapEditor ? (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4">
          <p className="text-sm font-semibold">
            {sessionLabel(sourceSession)} summary (client-visible)
          </p>
          <textarea
            value={recapDraft}
            onChange={(e) => setRecapDraft(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border px-3.5 py-3 text-base"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingRecap}
              onClick={() => void onSaveSummary()}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-55"
            >
              {savingRecap ? "Saving…" : "Save summary"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRecapEditor(false);
                setRecapDraft("");
              }}
              className="text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showTaskEditor ? (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4">
          <p className="text-sm font-semibold">
            {sessionLabel(targetSession)} tasks
          </p>
          {draftTasks.map((task, i) => (
            <div
              key={task.key}
              className="space-y-2 border-t border-border pt-3 first:border-0 first:pt-0"
            >
              <input
                value={task.title}
                onChange={(e) =>
                  setDraftTasks((prev) => {
                    const next = [...prev];
                    next[i] = { ...task, title: e.target.value };
                    return next;
                  })
                }
                placeholder="Task title"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-base"
              />
              <textarea
                value={task.instructions}
                onChange={(e) =>
                  setDraftTasks((prev) => {
                    const next = [...prev];
                    next[i] = { ...task, instructions: e.target.value };
                    return next;
                  })
                }
                rows={5}
                placeholder="Instructions"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-base"
              />
              <button
                type="button"
                onClick={() =>
                  setDraftTasks((prev) => prev.filter((_, j) => j !== i))
                }
                className="text-sm font-semibold text-rose-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDraftTasks((prev) => [...prev, emptyTask()])}
            className="text-sm font-semibold text-teal-800"
          >
            + Add task
          </button>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={savingTasks}
              onClick={() => void onAddTasks()}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-55"
            >
              {savingTasks ? "Adding…" : "Add tasks"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTaskEditor(false);
                setDraftTasks([]);
              }}
              className="text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
