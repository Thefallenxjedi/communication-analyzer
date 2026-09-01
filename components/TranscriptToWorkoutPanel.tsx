"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  FINAL_SESSION,
  INTRO_SESSION,
  PROGRAM_SLOTS,
  sessionLabel,
  transcriptWorkoutDefaults} from "@/lib/coaching-program";
import type { CoachingTask } from "@/lib/coaching-tasks";
import type { CoachingSessionSlot } from "@/lib/coaching-sessions";
import type { GeneratedWorkoutTask } from "@/lib/transcript-to-workout";
import type { SessionRecap } from "@/lib/session-recap";
import { expectedMinutesForExercise } from "@/lib/workout-exercises";

type DraftTask = GeneratedWorkoutTask & { key: string };

function emptyTask(): DraftTask {
  return {
    key: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    exerciseId: "pre-speak-routine",
    title: "",
    instructions: "",
    recordingRequired: false,
    reviewRequired: false};
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className ?? "h-5 w-5"}
      fill="none"
      aria-hidden
    >
      <path
        d="M4 10.5 7.5 14 16 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBanner({
  tone,
  children}: {
  tone: "success" | "info";
  children: ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-amber-200 bg-amber-50 text-amber-950";
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm font-semibold ${styles}`}
    >
      {tone === "success" ? (
        <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      ) : null}
      <span>{children}</span>
    </div>
  );
}

export function TranscriptToWorkoutPanel({
  clientId,
  targetSessionNumber,
  canEdit,
  onSaved}: {
  clientId: string;
  targetSessionNumber: number;
  canEdit: boolean;
  sessionLocked?: boolean;
  onSaved: (data: {
    tasks?: CoachingTask[];
    sessions?: CoachingSessionSlot[];
  }) => void | Promise<void>;
}) {
  const defaults = transcriptWorkoutDefaults(targetSessionNumber);

  const [transcript, setTranscript] = useState("");
  const [sourceSession, setSourceSession] = useState(defaults.summarySession);
  const [targetSession, setTargetSession] = useState(defaults.tasksSession);
  const [generatingRecap, setGeneratingRecap] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [savingRecap, setSavingRecap] = useState(false);
  const [savingTasks, setSavingTasks] = useState(false);
  const [error, setError] = useState("");
  const [recapDraft, setRecapDraft] = useState("");
  const [showRecapEditor, setShowRecapEditor] = useState(false);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [workspaceRecap, setWorkspaceRecap] = useState<SessionRecap | null>(null);
  const [summarySavedMsg, setSummarySavedMsg] = useState("");
  const [tasksSavedMsg, setTasksSavedMsg] = useState("");

  const loadWorkspaceRecap = useCallback(async () => {
    const summarySession = transcriptWorkoutDefaults(targetSessionNumber).summarySession;
    if (!canEdit || summarySession < 1) return;
    try {
      const res = await fetch(
        `/api/admin/session-recap?clientId=${encodeURIComponent(clientId)}&session=${summarySession}`,
      );
      const data = (await res.json()) as { recap?: SessionRecap | null };
      setWorkspaceRecap(data.recap ?? null);
    } catch {
      setWorkspaceRecap(null);
    }
  }, [clientId, canEdit, targetSessionNumber]);

  const loadSourceRecap = useCallback(async () => {
    if (!canEdit || sourceSession < 1) return null;
    try {
      const res = await fetch(
        `/api/admin/session-recap?clientId=${encodeURIComponent(clientId)}&session=${sourceSession}`,
      );
      const data = (await res.json()) as { recap?: SessionRecap | null };
      return data.recap ?? null;
    } catch {
      return null;
    }
  }, [clientId, canEdit, sourceSession]);

  useEffect(() => {
    const next = transcriptWorkoutDefaults(targetSessionNumber);
    setSourceSession(next.summarySession);
    setTargetSession(next.tasksSession);
    setSummarySavedMsg("");
    setTasksSavedMsg("");
    setShowRecapEditor(false);
    setRecapDraft("");
    setDraftTasks([]);
  }, [targetSessionNumber]);

  useEffect(() => {
    void loadWorkspaceRecap();
  }, [loadWorkspaceRecap]);

  useEffect(() => {
    void (async () => {
      const recap = await loadSourceRecap();
      if (recap?.sourceTranscript?.trim()) {
        setTranscript(recap.sourceTranscript.trim());
      }
    })();
  }, [loadSourceRecap]);

  async function onCreateSummary() {
    if (!transcript.trim()) {
      setError("Paste a transcript first.");
      return;
    }
    setGeneratingRecap(true);
    setError("");
    setSummarySavedMsg("");
    try {
      const res = await fetch("/api/admin/transcript-to-workout", {
        method: "POST",
        headers: {
          "content-type": "application/json"},
        body: JSON.stringify({
          clientId,
          transcript,
          sourceSessionNumber: sourceSession,
          targetSessionNumber: targetSession,
          mode: "recap"})});
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
          "content-type": "application/json"},
        body: JSON.stringify({
          clientId,
          sessionNumber: sourceSession,
          recapSummary: recapDraft.trim(),
          sourceTranscript: transcript.trim() || undefined})});
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save summary.");
      setShowRecapEditor(false);
      setRecapDraft("");
      setSummarySavedMsg(
        `Summary created for ${sessionLabel(sourceSession)}.`,
      );
      void loadWorkspaceRecap();
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
    setTasksSavedMsg("");
    try {
      const res = await fetch("/api/admin/transcript-to-workout", {
        method: "POST",
        headers: {
          "content-type": "application/json"},
        body: JSON.stringify({
          clientId,
          transcript,
          sourceSessionNumber: sourceSession,
          targetSessionNumber: targetSession,
          mode: "tasks"})});
      const data = (await res.json()) as {
        error?: string;
        draft?: { tasks: GeneratedWorkoutTask[] };
      };
      if (!res.ok) throw new Error(data.error || "Could not generate tasks.");
      setDraftTasks(
        (data.draft?.tasks ?? []).map((task, i) => ({
          ...task,
          key: `t-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`})),
      );
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
        const expectedMinutes = expectedMinutesForExercise(task.exerciseId);
        const res = await fetch("/api/admin/tasks", {
          method: "POST",
          headers: {
            "content-type": "application/json"},
          body: JSON.stringify({
            clientId,
            sessionNumber: targetSession,
            title: task.title.trim(),
            instructions: task.instructions.trim(),
            recordingRequired: task.recordingRequired,
            reviewRequired: task.reviewRequired,
            expectedMinutes: expectedMinutes ?? undefined})});
        const data = (await res.json()) as {
          error?: string;
          tasks?: CoachingTask[];
          sessions?: CoachingSessionSlot[];
        };
        if (!res.ok) throw new Error(data.error || "Could not create task.");
        lastData = data;
      }

      await onSaved(lastData);
      setDraftTasks([]);
      setTasksSavedMsg(
        `Tasks added to ${sessionLabel(targetSession)}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingTasks(false);
    }
  }

  if (targetSessionNumber >= FINAL_SESSION) {
    return null;
  }

  const hasStoredTranscript = Boolean(workspaceRecap?.sourceTranscript?.trim());
  const recapGenerated = showRecapEditor && recapDraft.trim().length > 0;
  const tasksGenerated = draftTasks.length > 0;

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
              {sessionLabel(defaults.summarySession)} summary (client-visible)
            </p>
            <button
              type="button"
              onClick={() => {
                setRecapDraft(workspaceRecap.recapSummary);
                setSourceSession(defaults.summarySession);
                setShowRecapEditor(true);
                setSummarySavedMsg("");
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
        {hasStoredTranscript ? (
          <span className="ml-2 text-xs font-semibold text-teal-700">
            Saved with summary
          </span>
        ) : null}
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
            {PROGRAM_SLOTS.filter((n) => n >= 1 && n < FINAL_SESSION).map((n) => (
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
            {PROGRAM_SLOTS.filter((n) => n >= 1 && n !== INTRO_SESSION).map((n) => (
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
          {generatingRecap
            ? "Creating…"
            : recapGenerated
              ? "Generate summary again"
              : "Create summary"}
        </button>
        <button
          type="button"
          disabled={generatingTasks || !transcript.trim()}
          onClick={() => void onGenerateTasks()}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-700 bg-white px-5 text-sm font-bold text-teal-800 disabled:opacity-55"
        >
          {generatingTasks
            ? "Generating…"
            : tasksGenerated
              ? "Generate tasks again"
              : "Generate tasks"}
        </button>
      </div>

      {recapGenerated && !summarySavedMsg ? (
        <StatusBanner tone="info">
          Summary generated for {sessionLabel(sourceSession)} — review and save
          below.
        </StatusBanner>
      ) : null}

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

      {summarySavedMsg ? (
        <StatusBanner tone="success">{summarySavedMsg}</StatusBanner>
      ) : null}

      {tasksGenerated && !tasksSavedMsg ? (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4">
          <StatusBanner tone="info">
            Tasks generated for {sessionLabel(targetSession)}.
          </StatusBanner>
          <div className="space-y-4 pt-1">
            {draftTasks.map((task, i) => (
              <div
                key={task.key}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-slate-900">
                    Task {i + 1}
                  </p>
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
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-base"
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
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-base"
                />
              </div>
            ))}
          </div>
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
              {savingTasks
                ? "Adding…"
                : `Confirm tasks and add to ${sessionLabel(targetSession)}`}
            </button>
            <button
              type="button"
              onClick={() => setDraftTasks([])}
              className="text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {tasksSavedMsg ? (
        <StatusBanner tone="success">{tasksSavedMsg}</StatusBanner>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
