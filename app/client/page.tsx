"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ember } from "@/components/Ember";
import { IntroCallView } from "@/components/IntroCallView";
import { SessionReport, SessionReportStep } from "@/components/SessionReport";
import { TaskRecorder } from "@/components/TaskRecorder";
import type { ClientSession } from "@/lib/client-session";
import {
  emptySessionSlots,
  type CoachingSessionSlot,
} from "@/lib/coaching-sessions";
import {
  INTRO_SESSION,
  parseCurrentStage,
  sessionLabel,
} from "@/lib/coaching-program";
import {
  needsCoachReview,
  taskStatusLabel,
  type CoachingTask,
} from "@/lib/coaching-tasks";
import { isIntroCallEmpty, type IntroCallReport } from "@/lib/intro-call";

type Milestone = "complete" | "current" | "upcoming";

type NavId = number;

function stageToNav(stage: string | undefined): NavId {
  return parseCurrentStage(stage);
}

function navClass(active: boolean, here: boolean): string {
  const base = "w-full rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap";
  if (active) return `${base} bg-[var(--es-void-3)] text-[var(--es-gold)]`;
  if (here) return `${base} text-[var(--es-gold)]`;
  return `${base} text-[var(--es-parchment-dim)] hover:text-[var(--es-parchment)]`;
}

function liveTaskId(tasks: CoachingTask[]): string | null {
  return (
    tasks.find((task) => task.status === "open")?.id ??
    tasks.find((task) => task.status === "submitted")?.id ??
    tasks[0]?.id ??
    null
  );
}

function isSessionComplete(tasks: CoachingTask[]): boolean {
  return (
    tasks.length > 0 &&
    tasks.every((task) => task.status === "reviewed" || task.status === "done")
  );
}

function sessionMilestone(
  sessionNumber: number,
  here: NavId,
  tasks: CoachingTask[],
): Milestone {
  if (isSessionComplete(tasks)) return "complete";
  if (here === sessionNumber) return "current";
  return "upcoming";
}

function tasksForSession(tasks: CoachingTask[], sessionNumber: number) {
  return tasks
    .filter((task) => (task.sessionNumber ?? 1) === sessionNumber)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function TaskScreen({
  task,
  draft,
  note,
  busy,
  showEmber,
  revising,
  onDraft,
  onNote,
  onSubmit,
  onStartRevise,
  onCancelRevise,
}: {
  task: CoachingTask;
  draft?: { file: File; durationSec: number };
  note: string;
  busy: boolean;
  showEmber: boolean;
  revising: boolean;
  onDraft: (file: File, durationSec: number) => void;
  onNote: (value: string) => void;
  onSubmit: (revise: boolean) => void;
  onStartRevise: () => void;
  onCancelRevise: () => void;
}) {
  const noteField = (
    <label className="block text-sm">
      <span className="es-label">Note (optional)</span>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value.slice(0, 4000))}
        rows={3}
        className="es-input mt-2"
        placeholder="Anything you want your coach to hear in words."
      />
    </label>
  );

  if (task.status === "open") {
    if (!task.recordingRequired) {
      return (
        <div className="es-report-action space-y-3">
          <p className="es-label">{taskStatusLabel(task.status)}</p>
          <p className="text-sm text-muted">
            Your coach is working on this. You do not need to record.
          </p>
        </div>
      );
    }
    return (
      <div className="es-report-action space-y-3">
        <div className="flex items-center gap-3">
          {showEmber ? <Ember state="play" /> : null}
          <p className="es-label">{taskStatusLabel(task.status)}</p>
        </div>
        <TaskRecorder look="client" disabled={busy} onReady={onDraft} />
        {noteField}
        <button
          type="button"
          disabled={busy || !draft}
          onClick={() => onSubmit(false)}
          className="es-btn"
        >
          {busy ? "Submitting…" : "Submit"}
        </button>
      </div>
    );
  }

  if (task.status === "submitted") {
    const canRevise = !task.clientRevisionUsed;
    return (
      <div className="es-report-action space-y-3">
        <div className="flex items-center gap-3">
          {showEmber ? <Ember state="review" /> : null}
          <p className="es-label">In review</p>
        </div>
        {task.recordingUrl ? (
          <audio controls src={task.recordingUrl} className="es-audio" />
        ) : null}
        {task.responseText ? (
          <p className="whitespace-pre-wrap text-sm">{task.responseText}</p>
        ) : null}
        {canRevise && !revising ? (
          <>
            <p className="text-sm text-muted">
              Submitted. You can change the recording or note once.
            </p>
            <button type="button" onClick={onStartRevise} className="es-btn">
              Change once
            </button>
          </>
        ) : null}
        {canRevise && revising ? (
          <>
            <TaskRecorder look="client" disabled={busy} onReady={onDraft} />
            {noteField}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || (!draft && note === (task.responseText || ""))}
                onClick={() => onSubmit(true)}
                className="es-btn"
              >
                {busy ? "Saving…" : "Save change"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onCancelRevise}
                className="text-sm underline"
                style={{ color: "var(--es-parchment-dim)" }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}
        {!canRevise ? (
          <p className="text-sm text-muted">
            Your one change is used. Your coach is reviewing this.
          </p>
        ) : null}
      </div>
    );
  }

  if (!needsCoachReview(task) || task.rating == null) {
    return (
      <div className="es-report-action space-y-3">
        <div className="flex items-center gap-3">
          {showEmber ? <Ember state="done" /> : null}
          <p className="es-label">Done</p>
        </div>
        {task.recordingUrl ? (
          <audio controls src={task.recordingUrl} className="es-audio" />
        ) : null}
        {task.responseText ? (
          <p className="whitespace-pre-wrap text-sm">{task.responseText}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="es-report-action space-y-4">
      <div className="flex items-center gap-3">
        {showEmber ? <Ember state="done" /> : null}
        <p className="es-label">Coach review</p>
      </div>
      <p className="es-mono text-5xl tabular-nums leading-none">
        {task.rating ?? "—"}
        <span className="text-lg text-muted"> / 10</span>
      </p>
      {task.ratingComment ? (
        <p className="whitespace-pre-wrap leading-relaxed">{task.ratingComment}</p>
      ) : (
        <p className="text-sm text-muted">No written comment.</p>
      )}
      {task.recordingUrl ? (
        <audio controls src={task.recordingUrl} className="es-audio" />
      ) : null}
      {task.responseText ? (
        <p className="whitespace-pre-wrap text-sm">{task.responseText}</p>
      ) : null}
    </div>
  );
}

export default function ClientHomePage() {
  const router = useRouter();
  const [client, setClient] = useState<ClientSession | null>(null);
  const [tasks, setTasks] = useState<CoachingTask[]>([]);
  const [sessions, setSessions] = useState<CoachingSessionSlot[]>(emptySessionSlots);
  const [intro, setIntro] = useState<IntroCallReport | null>(null);
  const [nav, setNav] = useState<NavId>(INTRO_SESSION);
  const [drafts, setDrafts] = useState<
    Record<string, { file: File; durationSec: number }>
  >({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sessionRes = await fetch("/api/client/session");
    const sessionData = (await sessionRes.json()) as {
      client?: ClientSession | null;
    };
    if (!sessionRes.ok || !sessionData.client) {
      router.replace("/client/login");
      return;
    }
    setClient(sessionData.client);

    const workoutRes = await fetch("/api/client/workouts");
    const workoutData = (await workoutRes.json()) as {
      error?: string;
      tasks?: CoachingTask[];
      sessions?: CoachingSessionSlot[];
    };
    if (!workoutRes.ok) {
      setError(workoutData.error || "Could not load tasks.");
      return;
    }
    setTasks(workoutData.tasks || []);
    setSessions(
      workoutData.sessions?.length ? workoutData.sessions : emptySessionSlots(),
    );

    const introRes = await fetch("/api/client/intro-call");
    const introData = (await introRes.json()) as {
      report?: IntroCallReport | null;
    };
    setIntro(introData.report ?? null);
    setError("");
    return sessionData.client;
  }, [router]);

  useEffect(() => {
    void load().then((row) => {
      if (row) setNav(stageToNav(row.currentStage));
    });
  }, [load]);

  async function logout() {
    await fetch("/api/client/session", { method: "DELETE" });
    router.replace("/client/login");
  }

  async function submitTask(taskId: string, revise: boolean) {
    const draft = drafts[taskId];
    const note = notes[taskId] ?? "";
    if (!revise && !draft) {
      setError("Record first, then submit.");
      return;
    }
    if (revise && !draft && !note.trim()) {
      setError("Record a new clip or update the note.");
      return;
    }
    setBusyId(taskId);
    setError("");
    try {
      let storageId: string | undefined;
      if (draft) {
        const uploadRes = await fetch("/api/client/workouts/upload", {
          method: "POST",
        });
        const uploadData = (await uploadRes.json()) as {
          error?: string;
          uploadUrl?: string;
        };
        if (!uploadRes.ok || !uploadData.uploadUrl) {
          throw new Error(uploadData.error || "Could not start upload.");
        }

        const putRes = await fetch(uploadData.uploadUrl, {
          method: "POST",
          headers: { "Content-Type": draft.file.type || "audio/webm" },
          body: draft.file,
        });
        if (!putRes.ok) throw new Error("Could not upload recording.");
        const putData = (await putRes.json()) as { storageId?: string };
        if (!putData.storageId) throw new Error("Upload did not return a file id.");
        storageId = putData.storageId;
      }

      const res = await fetch("/api/client/workouts", {
        method: revise ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          storageId,
          durationSec: draft?.durationSec,
          responseText: note,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit.");
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setRevisingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!client) {
    return (
      <main className="px-6 py-16">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  const row = client;
  const here = stageToNav(row.currentStage);
  const selectedTasks = tasksForSession(tasks, nav);
  const emberId = liveTaskId(
    selectedTasks.filter((task) => task.recordingRequired),
  );
  const introTasks = tasksForSession(tasks, INTRO_SESSION);
  const introDone =
    !isIntroCallEmpty(intro) &&
    (introTasks.length === 0 || isSessionComplete(introTasks));
  const introMilestone: Milestone =
    introDone && here !== INTRO_SESSION
      ? "complete"
      : here === INTRO_SESSION
        ? "current"
        : "upcoming";

  function stepTitle(task: CoachingTask, index: number) {
    const raw = task.title.trim();
    if (/^task\s+\d+/i.test(raw) || nav === INTRO_SESSION) return raw;
    return `Task ${index + 1}`;
  }

  function sessionKicker() {
    if (nav === INTRO_SESSION) {
      return `${row.name}, record your baseline. Your coach will write the diagnosis after the call.`;
    }
    if (selectedTasks.length === 0) {
      return `${row.name}, your coach will assign this session soon.`;
    }
    return `${row.name}, work through each step below. Record when you are ready, then wait for your coach review.`;
  }

  function renderTaskStep(task: CoachingTask, index: number) {
    return (
      <SessionReportStep key={task.id} n={index + 1} title={stepTitle(task, index)}>
        <p>{task.instructions}</p>
        <TaskScreen
          task={task}
          draft={drafts[task.id]}
          note={notes[task.id] ?? task.responseText ?? ""}
          busy={busyId === task.id}
          showEmber={emberId === task.id}
          revising={revisingId === task.id}
          onDraft={(file, durationSec) =>
            setDrafts((prev) => ({
              ...prev,
              [task.id]: { file, durationSec },
            }))
          }
          onNote={(value) =>
            setNotes((prev) => ({ ...prev, [task.id]: value }))
          }
          onSubmit={(revise) => void submitTask(task.id, revise)}
          onStartRevise={() => {
            setRevisingId(task.id);
            setNotes((prev) => ({
              ...prev,
              [task.id]: prev[task.id] ?? task.responseText ?? "",
            }));
          }}
          onCancelRevise={() => {
            setRevisingId(null);
            setDrafts((prev) => {
              const next = { ...prev };
              delete next[task.id];
              return next;
            });
          }}
        />
      </SessionReportStep>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="border-b border-[var(--border)] bg-[var(--es-void-2)] md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 py-6">
          <p className="es-label">EliteSpeak</p>
          <p className="mt-3 font-medium">{client.name}</p>
          <p className="text-xs text-muted">{client.email}</p>
          {client.currentFocus ? (
            <p className="mt-3 text-xs text-muted">{client.currentFocus}</p>
          ) : null}
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-3 md:pb-6">
          <button
            type="button"
            onClick={() => setNav(INTRO_SESSION)}
            className={navClass(nav === INTRO_SESSION, introMilestone === "current")}
          >
            <span className="flex items-center gap-2">
              {introMilestone === "complete" ? (
                <span className="es-nav-tick">✓</span>
              ) : null}
              Intro Call
            </span>
            {introMilestone === "current" ? (
              <span className="es-nav-meta">Current session</span>
            ) : null}
          </button>
          {sessions.map((slot) => {
            const slotTasks = tasksForSession(tasks, slot.sessionNumber);
            const milestone = sessionMilestone(slot.sessionNumber, here, slotTasks);
            return (
              <button
                key={slot.sessionNumber}
                type="button"
                onClick={() => setNav(slot.sessionNumber)}
                className={navClass(nav === slot.sessionNumber, milestone === "current")}
              >
                <span className="flex items-center gap-2">
                  {milestone === "complete" ? (
                    <span className="es-nav-tick">✓</span>
                  ) : null}
                  {sessionLabel(slot.sessionNumber)}
                </span>
                {milestone === "current" ? (
                  <span className="es-nav-meta">
                    {client.reviewRequired ? "In review" : "Current session"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-[var(--border)] px-4 py-4">
          {client.meetingLink ? (
            <a
              href={client.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-[var(--es-gold)] underline"
            >
              Meeting link
            </a>
          ) : (
            <p className="text-xs text-muted">No meeting link yet.</p>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm text-muted underline"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col p-4 md:p-6">
          <SessionReport
            className="flex-1"
            title={sessionLabel(nav)}
            kicker={sessionKicker()}
          >
            {selectedTasks.length === 0 && nav !== INTRO_SESSION ? (
              <p className="text-muted">Your coach will assign this soon.</p>
            ) : (
              selectedTasks.map((task, index) => renderTaskStep(task, index))
            )}
            {nav === INTRO_SESSION ? (
              <SessionReportStep
                n={selectedTasks.length + 1}
                title="Intro Diagnosis"
              >
                <IntroCallView clientName={client.name} report={intro} />
              </SessionReportStep>
            ) : null}
          </SessionReport>
          {error ? (
            <p className="mt-4 text-sm" style={{ color: "var(--es-ember)" }}>
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
