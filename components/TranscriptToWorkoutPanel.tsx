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
  sessionLocked,
  onSaved,
}: {
  clientId: string;
  targetSessionNumber: number;
  password: string;
  sessionLocked: boolean;
  onSaved: (data: {
    tasks?: CoachingTask[];
    sessions?: CoachingSessionSlot[];
  }) => void | Promise<void>;
}) {
  const defaultSource =
    targetSessionNumber > 1 ? targetSessionNumber - 1 : 1;

  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sourceSession, setSourceSession] = useState(defaultSource);
  const [targetSession, setTargetSession] = useState(targetSessionNumber);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recap, setRecap] = useState("");
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [existingRecap, setExistingRecap] = useState<SessionRecap | null>(null);
  const [workspaceRecap, setWorkspaceRecap] = useState<SessionRecap | null>(null);

  const loadExistingRecap = useCallback(async () => {
    if (!password || sourceSession < 1) return;
    try {
      const res = await fetch(
        `/api/admin/session-recap?clientId=${encodeURIComponent(clientId)}&session=${sourceSession}`,
        { headers: { "x-admin-password": password } },
      );
      const data = (await res.json()) as { recap?: SessionRecap | null };
      setExistingRecap(data.recap ?? null);
    } catch {
      setExistingRecap(null);
    }
  }, [clientId, password, sourceSession]);

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

  useEffect(() => {
    setSourceSession(targetSessionNumber > 1 ? targetSessionNumber - 1 : 1);
    setTargetSession(targetSessionNumber);
  }, [targetSessionNumber]);

  useEffect(() => {
    void loadExistingRecap();
  }, [loadExistingRecap]);

  useEffect(() => {
    void loadWorkspaceRecap();
  }, [loadWorkspaceRecap]);

  async function onGenerate() {
    setGenerating(true);
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
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        draft?: { sessionRecap: string; tasks: GeneratedWorkoutTask[] };
      };
      if (!res.ok) throw new Error(data.error || "Could not generate.");
      setRecap(data.draft?.sessionRecap ?? "");
      setDraftTasks(
        (data.draft?.tasks ?? []).map((task) => ({
          ...task,
          key: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function onSave() {
    if (!recap.trim()) {
      setError("Session recap is empty.");
      return;
    }
    if (draftTasks.length === 0) {
      setError("Add at least one task.");
      return;
    }
    if (
      existingRecap?.recapSummary &&
      !window.confirm(
        `${sessionLabel(sourceSession)} already has a recap. Replace it with this draft?`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const recapRes = await fetch("/api/admin/session-recap", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          clientId,
          sessionNumber: sourceSession,
          recapSummary: recap.trim(),
          sourceTranscript: transcript.trim() || undefined,
        }),
      });
      const recapData = (await recapRes.json()) as { error?: string };
      if (!recapRes.ok) {
        throw new Error(recapData.error || "Could not save recap.");
      }

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
      setOpen(false);
      setTranscript("");
      setRecap("");
      setDraftTasks([]);
      void loadExistingRecap();
      void loadWorkspaceRecap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (
    targetSessionNumber === INTRO_SESSION ||
    targetSessionNumber >= FINAL_SESSION
  ) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-800">
            Transcript → workout
          </p>
          <p className="mt-1 text-sm text-muted">
            Paste the call transcript. Get a {sessionLabel(sourceSession)} recap
            plus {sessionLabel(targetSession)} lesson tasks.
          </p>
        </div>
        {sessionLocked ? null : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm font-semibold text-teal-800 hover:text-teal-950"
          >
            {open ? "Close" : "Generate from transcript"}
          </button>
        )}
      </div>

      {workspaceRecap?.recapSummary && !open ? (
        <div className="mt-3 rounded-xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">
              {sessionLabel(targetSessionNumber)} recap (client-visible)
            </p>
            {sessionLocked ? null : (
              <button
                type="button"
                onClick={() => {
                  setRecap(workspaceRecap.recapSummary);
                  setSourceSession(targetSessionNumber);
                  setOpen(true);
                }}
                className="text-sm font-semibold text-teal-800"
              >
                Edit
              </button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {workspaceRecap.recapSummary}
          </p>
        </div>
      ) : null}

      {existingRecap?.recapSummary &&
      sourceSession !== targetSessionNumber &&
      !workspaceRecap?.recapSummary ? (
        <p className="mt-3 text-sm text-slate-700">
          <span className="font-semibold">{sessionLabel(sourceSession)} recap</span>{" "}
          saved — client can read it on their session page.
        </p>
      ) : null}

      {open && !sessionLocked ? (
        <div className="mt-4 space-y-4 border-t border-teal-200/80 pt-4">
          <label className="block text-sm font-semibold">
            Google Meet transcript
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Paste transcript here…"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Call session (recap)
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
              Assign tasks to
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
          <button
            type="button"
            disabled={generating || !transcript.trim()}
            onClick={() => void onGenerate()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white disabled:opacity-55"
          >
            {generating ? "Generating…" : "Generate draft"}
          </button>

          {recap || draftTasks.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-border bg-white p-4">
              <label className="block text-sm font-semibold">
                {sessionLabel(sourceSession)} recap (client-visible)
                <textarea
                  value={recap}
                  onChange={(e) => setRecap(e.target.value)}
                  rows={6}
                  className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-3 text-base"
                />
              </label>
              <div>
                <p className="text-sm font-semibold">
                  {sessionLabel(targetSession)} tasks
                </p>
                {draftTasks.map((task, i) => (
                  <div
                    key={task.key}
                    className="mt-3 space-y-2 border-t border-border pt-3"
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
                  className="mt-2 text-sm font-semibold text-teal-800"
                >
                  + Add task
                </button>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void onSave()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-55"
              >
                {saving ? "Saving…" : "Save recap + add tasks"}
              </button>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
