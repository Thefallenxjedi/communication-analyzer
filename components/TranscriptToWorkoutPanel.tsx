"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  INTRO_SESSION,
  finalSessionNumber,
  isFinalSession,
  programSlots,
  sessionLabel,
  transcriptWorkoutDefaults,
} from "@/lib/coaching-program";
import type { CoachingTask } from "@/lib/coaching-tasks";
import type { CoachingSessionSlot } from "@/lib/coaching-sessions";
import type { GeneratedWorkoutTask } from "@/lib/transcript-to-workout";
import type { SessionRecap } from "@/lib/session-recap";
import {
  clampTaskExpectedMinutes,
  expectedMinutesForExercise,
} from "@/lib/workout-exercises";

type DraftTask = GeneratedWorkoutTask & { key: string };

function emptyTask(): DraftTask {
  return {
    key: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    exerciseId: "p01-e1-i-believe-that",
    title: "",
    instructions: "",
    example: "",
    expectedMinutes: 7,
    recordingRequired: false,
  };
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

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="What this does"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-white text-teal-800 shadow-sm transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      >
        <span className="text-sm font-extrabold">i</span>
      </button>
      <span className="pointer-events-none invisible absolute right-0 top-10 z-20 w-72 rounded-2xl border border-slate-200 bg-slate-950 px-3.5 py-3 text-xs font-medium leading-relaxed text-white opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}

function RequirementToggles({
  recordingRequired,
  video,
  disabled,
  onRecordingRequired,
}: {
  recordingRequired: boolean;
  video: boolean;
  disabled?: boolean;
  onRecordingRequired: (value: boolean) => void;
}) {
  const recordHint = video
    ? "Client pastes a Drive or YouTube link."
    : "Client records audio in the app.";

  return (
    <div className="mt-3">
      <label className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm">
        <span className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={recordingRequired}
            disabled={disabled}
            onChange={(e) => onRecordingRequired(e.target.checked)}
            className="mt-1 h-4 w-4 accent-slate-900"
          />
          <span>
            <span className="block font-extrabold text-slate-900">
              Audio required
            </span>
            <span className="mt-1 block text-muted">
              {recordingRequired
                ? recordHint
                : "Written task only. No recording required."}
            </span>
          </span>
        </span>
      </label>
      <p className="mt-2 text-xs text-muted">
        Audio submissions automatically move to In review. Written tasks
        complete immediately.
      </p>
    </div>
  );
}

export function TranscriptToWorkoutPanel({
  clientId,
  targetSessionNumber,
  workSessionCount,
  canEdit,
  onSaved}: {
  clientId: string;
  targetSessionNumber: number;
  workSessionCount?: number;
  canEdit: boolean;
  sessionLocked?: boolean;
  onSaved: (data: {
    tasks?: CoachingTask[];
    sessions?: CoachingSessionSlot[];
  }) => void | Promise<void>;
}) {
  const slots = programSlots(workSessionCount);
  const finalN = finalSessionNumber(workSessionCount);
  const defaults = transcriptWorkoutDefaults(targetSessionNumber, workSessionCount);

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
  const [expandedDraftTaskKeys, setExpandedDraftTaskKeys] = useState<string[]>([]);
  const [workspaceRecap, setWorkspaceRecap] = useState<SessionRecap | null>(null);
  const [summarySavedMsg, setSummarySavedMsg] = useState("");
  const [tasksSavedMsg, setTasksSavedMsg] = useState("");

  const loadWorkspaceRecap = useCallback(async () => {
    const summarySession = transcriptWorkoutDefaults(
      targetSessionNumber,
      workSessionCount,
    ).summarySession;
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
  }, [clientId, canEdit, targetSessionNumber, workSessionCount]);

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
    const next = transcriptWorkoutDefaults(targetSessionNumber, workSessionCount);
    setSourceSession(next.summarySession);
    setTargetSession(next.tasksSession);
    setSummarySavedMsg("");
    setTasksSavedMsg("");
    setShowRecapEditor(false);
    setRecapDraft("");
    setDraftTasks([]);
    setExpandedDraftTaskKeys([]);
  }, [targetSessionNumber, workSessionCount]);

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
        `${sessionLabel(sourceSession, workSessionCount)} already has a summary. Replace it?`,
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
        `Summary created for ${sessionLabel(sourceSession, workSessionCount)}.`,
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
          expectedMinutes: clampTaskExpectedMinutes(task.expectedMinutes, 7),
          key: `t-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      );
      setExpandedDraftTaskKeys([]);
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
    const savedRecap = await loadSourceRecap();
    if (!savedRecap?.recapSummary.trim()) {
      setError(
        `Save the ${sessionLabel(sourceSession, workSessionCount)} summary before publishing its tasks.`,
      );
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
        const expectedMinutes = clampTaskExpectedMinutes(
          task.expectedMinutes ??
            expectedMinutesForExercise(task.exerciseId),
          7,
        );
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
            expectedMinutes})});
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
      setExpandedDraftTaskKeys([]);
      const eventRes = await fetch(
        `/api/admin/clients/${encodeURIComponent(clientId)}/session-completed`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ sessionNumber: sourceSession }),
        },
      );
      const eventData = (await eventRes.json()) as { error?: string };
      if (!eventRes.ok) {
        setError(
          `Tasks were saved, but the session email failed: ${
            eventData.error || "unknown error"
          }`,
        );
      }
      setTasksSavedMsg(
        `Tasks added to ${sessionLabel(targetSession, workSessionCount)}.${
          eventRes.ok ? " Client email triggered." : ""
        }`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingTasks(false);
    }
  }

  if (isFinalSession(targetSessionNumber, workSessionCount)) {
    return null;
  }

  const hasStoredTranscript = Boolean(workspaceRecap?.sourceTranscript?.trim());
  const recapGenerated = showRecapEditor && recapDraft.trim().length > 0;
  const tasksGenerated = draftTasks.length > 0;
  const readOnly = !canEdit;

  return (
    <div className="mt-6 space-y-4 rounded-[1.6rem] border-2 border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-4 shadow-[0_18px_44px_-28px_rgba(15,118,110,0.45)]">
      <div className="rounded-[1.35rem] border border-teal-100 bg-white/95 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-800">
                AI workflow
              </span>
              <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
                Coach tool
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-base font-extrabold uppercase tracking-[0.18em] text-slate-900 sm:text-lg">
                Transcript → workout
              </p>
              <InfoTooltip text="Turns one call transcript into two coach assets: a client-visible session summary for the source session and draft lesson tasks for the target session. Nothing is saved until you review and confirm it." />
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Turn one transcript into a polished client summary and draft follow-up tasks for the next session.
            </p>
          </div>
          <div className="grid min-w-[13rem] gap-2 sm:w-auto sm:grid-cols-2">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-3.5 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-teal-800">
                1. Summary
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Create the client-facing recap.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-700">
                2. Tasks
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Draft lesson tasks for the next session.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            Uses saved recap when available
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            Review before saving
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            No auto-save
          </span>
        </div>
      </div>

      {workspaceRecap?.recapSummary && !showRecapEditor ? (
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">
              {sessionLabel(defaults.summarySession, workSessionCount)} summary (client-visible)
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

      {readOnly ? (
        <StatusBanner tone="info">
          View-only mode. Editors and admins can run transcript generation and save results.
        </StatusBanner>
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
          disabled={readOnly}
          placeholder="Paste transcript here…"
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Summary for
          <select
            value={sourceSession}
            onChange={(e) => setSourceSession(Number(e.target.value))}
            disabled={readOnly}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {slots.filter((n) => n >= 1 && n < finalN).map((n) => (
              <option key={n} value={n}>
                {sessionLabel(n, workSessionCount)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Tasks for
          <select
            value={targetSession}
            onChange={(e) => setTargetSession(Number(e.target.value))}
            disabled={readOnly}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {slots.filter((n) => n >= 1 && n !== INTRO_SESSION).map((n) => (
              <option key={n} value={n}>
                {sessionLabel(n, workSessionCount)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={readOnly || generatingRecap || !transcript.trim()}
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
          disabled={readOnly || generatingTasks || !transcript.trim()}
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
          Summary generated for {sessionLabel(sourceSession, workSessionCount)} — review and save
          below.
        </StatusBanner>
      ) : null}

      {showRecapEditor ? (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4">
          <p className="text-sm font-semibold">
            {sessionLabel(sourceSession, workSessionCount)} summary (client-visible)
          </p>
          <textarea
            value={recapDraft}
            onChange={(e) => setRecapDraft(e.target.value)}
            rows={6}
            disabled={readOnly}
            className="w-full rounded-xl border border-border px-3.5 py-3 text-base disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={readOnly || savingRecap}
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
            Tasks generated for {sessionLabel(targetSession, workSessionCount)}.
          </StatusBanner>
          <div className="space-y-4 pt-1">
            {draftTasks.map((task, i) => {
              const expanded = expandedDraftTaskKeys.includes(task.key);
              return (
                <div
                  key={task.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDraftTaskKeys((prev) =>
                          prev.includes(task.key)
                            ? prev.filter((key) => key !== task.key)
                            : [...prev, task.key],
                        )
                      }
                      className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          Task {i + 1}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                          {task.title.trim() || "Untitled task"}
                        </p>
                      </div>
                      <span className="text-2xl leading-none text-slate-500">
                        {expanded ? "−" : "+"}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        setDraftTasks((prev) => prev.filter((_, j) => j !== i));
                        setExpandedDraftTaskKeys((prev) =>
                          prev.filter((key) => key !== task.key),
                        );
                      }}
                      className="text-sm font-semibold text-rose-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">
                      Exercise: {task.exerciseId}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">
                      Audio required: {task.recordingRequired ? "Yes" : "No"}
                    </span>
                  </div>
                  {expanded ? (
                    <>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem]">
                        <input
                          value={task.title}
                          onChange={(e) =>
                            setDraftTasks((prev) => {
                              const next = [...prev];
                              next[i] = { ...task, title: e.target.value };
                              return next;
                            })
                          }
                          disabled={readOnly}
                          placeholder="Task title"
                          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-base disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        <label className="block text-xs font-semibold text-slate-600">
                          Minutes
                          <input
                            type="number"
                            min={5}
                            max={10}
                            value={task.expectedMinutes ?? 7}
                            onChange={(e) =>
                              setDraftTasks((prev) => {
                                const next = [...prev];
                                next[i] = {
                                  ...task,
                                  expectedMinutes: clampTaskExpectedMinutes(
                                    Number(e.target.value),
                                    7,
                                  ),
                                };
                                return next;
                              })
                            }
                            disabled={readOnly}
                            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </label>
                      </div>
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
                        disabled={readOnly}
                        placeholder="Instructions"
                        className="mt-2 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-base disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      />
                      <RequirementToggles
                        recordingRequired={task.recordingRequired}
                        video={targetSession === INTRO_SESSION}
                        disabled={readOnly}
                        onRecordingRequired={(value) =>
                          setDraftTasks((prev) => {
                            const next = [...prev];
                            next[i] = { ...task, recordingRequired: value };
                            return next;
                          })
                        }
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              const nextTask = emptyTask();
              setDraftTasks((prev) => [...prev, nextTask]);
              setExpandedDraftTaskKeys((prev) => [...prev, nextTask.key]);
            }}
            className="text-sm font-semibold text-teal-800 disabled:opacity-50"
          >
            + Add task
          </button>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={readOnly || savingTasks}
              onClick={() => void onAddTasks()}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-55"
            >
              {savingTasks
                ? "Adding…"
                : `Confirm tasks and add to ${sessionLabel(targetSession, workSessionCount)}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftTasks([]);
                setExpandedDraftTaskKeys([]);
              }}
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
