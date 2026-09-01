"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ember } from "@/components/Ember";
import { HowItWorksRoadmap } from "@/components/HowItWorksRoadmap";
import { LinkedInMark, LinkedInUpload } from "@/components/LinkedInUpload";
import { ClipPlayer } from "@/components/ClipPlayer";
import { IntroCallView } from "@/components/IntroCallView";
import { SessionRecapView } from "@/components/SessionRecapView";
import { SessionReport, SessionReportStep } from "@/components/SessionReport";
import { SessionWaiting } from "@/components/SessionWaiting";
import { TaskRecorder } from "@/components/TaskRecorder";
import type { ClientSession } from "@/lib/client-session";
import {
  emptySessionSlots,
  ensureSessionSlots,
  type CoachingSessionSlot,
} from "@/lib/coaching-sessions";
import {
  FINAL_SESSION,
  INTRO_SESSION,
  isClientSessionUnlocked,
  parseCurrentStage,
  previousProgramSession,
  sessionLabel,
} from "@/lib/coaching-program";
import {
  needsCoachReview,
  usesVideoLink,
  type CoachingTask,
} from "@/lib/coaching-tasks";
import { videoShareKind } from "@/lib/google-drive";
import { isIntroCallEmpty, type IntroCallReport } from "@/lib/intro-call";
import type { SessionRecap } from "@/lib/session-recap";

type Milestone = "complete" | "current" | "upcoming";

type NavId = number | "how-it-works" | "linkedin";

function stageToNav(stage: string | undefined): NavId {
  return parseCurrentStage(stage);
}

function navClass(active: boolean, here: boolean, locked = false): string {
  if (active) return "es-nav-item es-nav-item--active";
  if (here) return "es-nav-item es-nav-item--here";
  if (locked) return "es-nav-item es-nav-item--locked";
  return "es-nav-item";
}

function sessionNavShort(sessionNumber: number): string {
  if (sessionNumber === INTRO_SESSION) return "Intro";
  if (sessionNumber === FINAL_SESSION) return "Final";
  return String(sessionNumber);
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

function isSessionNav(nav: NavId): nav is number {
  return typeof nav === "number";
}

function CompassMark() {
  return (
    <svg viewBox="0 0 24 24" className="es-nav-how-icon" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M12 3.6v1.6M12 18.8v1.6M3.6 12h1.6M18.8 12h1.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        fill="currentColor"
        d="M12.7 7.4 14.8 14l-2.1-.9-.9-2.1-2.1.9 2.1-6.5z"
      />
    </svg>
  );
}

function DriveMark() {
  return (
    <svg viewBox="0 0 24 24" className="es-share-icon" aria-hidden>
      <path fill="#1a73e8" d="M8.2 3.5h7.6L22 15.2h-7.6z" />
      <path fill="#137333" d="M8.2 3.5 2 15.2l3.8 6.3 6.2-11.7z" />
      <path fill="#fbbc04" d="M14.4 15.2H2l3.8 6.3h12.4z" />
    </svg>
  );
}

function YouTubeMark() {
  return (
    <svg viewBox="0 0 24 24" className="es-share-icon" aria-hidden>
      <path
        fill="#ff0000"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.2C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 32 32 0 0 0 0 12a32 32 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.2c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.2A32 32 0 0 0 24 12a32 32 0 0 0-.5-5.8z"
      />
      <path fill="#fff" d="M9.8 15.6V8.4L16 12z" />
    </svg>
  );
}

function VideoShareLink({ href }: { href: string }) {
  const kind = videoShareKind(href);
  return (
    <a href={href} target="_blank" rel="noreferrer" className="es-share-card">
      {kind === "youtube" ? <YouTubeMark /> : <DriveMark />}
      <span className="es-share-card-copy">
        <span className="es-share-card-kind">
          {kind === "youtube" ? "YouTube" : "Google Drive"}
        </span>
        <span className="es-share-card-action">Open video →</span>
      </span>
    </a>
  );
}

function TaskScreen({
  task,
  driveLink,
  draft,
  busy,
  showEmber,
  sessionComplete,
  revising,
  onDriveLink,
  onDraft,
  onSubmit,
  onStartRevise,
  onCancelRevise,
}: {
  task: CoachingTask;
  driveLink: string;
  draft?: { file: File; durationSec: number };
  busy: boolean;
  showEmber: boolean;
  sessionComplete: boolean;
  revising: boolean;
  onDriveLink: (value: string) => void;
  onDraft: (file: File, durationSec: number) => void;
  onSubmit: (revise: boolean) => void;
  onStartRevise: () => void;
  onCancelRevise: () => void;
}) {
  const videoLink = usesVideoLink(task);
  const linkField = (
    <div className="es-link-panel">
      <p className="es-link-kicker">Your recording</p>
      <p className="es-link-title">Paste a Drive or YouTube link</p>
      <p className="es-link-hint">
        Upload a 60–90 second clip. Anyone with the link must be able to view
        it.
      </p>
      <div className="es-link-chips">
        <span>
          <DriveMark /> Google Drive
        </span>
        <span>
          <YouTubeMark /> YouTube
        </span>
      </div>
      <div className="es-link-row">
        <input
          type="url"
          value={driveLink}
          onChange={(e) => onDriveLink(e.target.value.slice(0, 500))}
          placeholder="https://…"
          autoComplete="off"
        />
        {task.status === "open" ? (
          <button
            type="button"
            disabled={busy || !driveLink.trim()}
            onClick={() => onSubmit(false)}
            className="es-btn"
          >
            {busy ? "Saving…" : "Submit"}
          </button>
        ) : null}
      </div>
    </div>
  );

  if (task.status === "open") {
    if (!task.recordingRequired) {
      if (!needsCoachReview(task)) {
        return (
          <div className="es-task-well">
            <div className="es-task-controls">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSubmit(false)}
                className="es-btn"
              >
                {busy ? "Saving…" : "Mark complete"}
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="es-task-well">
          <p className="es-task-hint">
            Your coach is working on this. You do not need to record.
          </p>
        </div>
      );
    }
    if (videoLink) {
      return <div className="es-task-well">{linkField}</div>;
    }
    return (
      <div className="es-task-well">
        <p className="es-label">Your take</p>
        <div className="es-task-controls">
          <TaskRecorder look="client" disabled={busy} onReady={onDraft} />
          <button
            type="button"
            disabled={busy || !draft}
            onClick={() => onSubmit(false)}
            className="es-btn"
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    );
  }

  if (task.status === "submitted") {
    const canRevise = !sessionComplete && !task.clientRevisionUsed;
    return (
      <div className="es-task-well">
        <div className="es-task-status">
          <div className="es-task-status-label">
            {showEmber ? <Ember state="review" /> : null}
            <p className="es-label">In review</p>
          </div>
          {canRevise && !revising ? (
            <button type="button" onClick={onStartRevise} className="es-btn">
              Edit
            </button>
          ) : null}
        </div>
        {task.driveUrl ? <VideoShareLink href={task.driveUrl} /> : null}
        {task.recordingUrl && !task.driveUrl ? (
          <ClipPlayer src={task.recordingUrl} durationSec={task.durationSec} />
        ) : null}
        {canRevise && revising ? (
          <>
            {videoLink ? (
              linkField
            ) : (
              <div className="es-task-controls">
                <TaskRecorder look="client" disabled={busy} onReady={onDraft} />
              </div>
            )}
            <div className="es-task-controls">
              <button
                type="button"
                disabled={busy || (videoLink ? !driveLink.trim() : !draft)}
                onClick={() => onSubmit(true)}
                className="es-btn"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onCancelRevise}
                className="es-link-btn"
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}
        {!canRevise && !sessionComplete ? (
          <p className="es-task-hint">
            Your one edit is used. Your coach is reviewing this.
          </p>
        ) : null}
      </div>
    );
  }

  if (!needsCoachReview(task) || task.rating == null) {
    return (
      <div className="es-task-well es-task-well--done">
        <p className="es-task-done">
          <span className="es-task-done-mark">✓</span>
          Completed
        </p>
        {task.driveUrl ? <VideoShareLink href={task.driveUrl} /> : null}
        {task.recordingUrl && !task.driveUrl ? (
          <ClipPlayer src={task.recordingUrl} durationSec={task.durationSec} />
        ) : null}
        {task.responseText ? (
          <p className="whitespace-pre-wrap text-sm">{task.responseText}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="es-task-well es-task-well--done">
      <p className="es-task-done">
        <span className="es-task-done-mark">✓</span>
        Completed
      </p>
      <p className="es-mono text-5xl tabular-nums leading-none">
        {task.rating ?? "—"}
        <span className="text-lg text-muted"> / 10</span>
      </p>
      {task.ratingComment ? (
        <p className="es-review-comment">{task.ratingComment}</p>
      ) : (
        <p className="es-task-hint">No written comment.</p>
      )}
      {task.driveUrl ? <VideoShareLink href={task.driveUrl} /> : null}
      {task.recordingUrl && !task.driveUrl ? (
        <ClipPlayer src={task.recordingUrl} durationSec={task.durationSec} />
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
  const [sessionRecap, setSessionRecap] = useState<SessionRecap | null>(null);
  const [nav, setNav] = useState<NavId>(INTRO_SESSION);
  const [driveLinks, setDriveLinks] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<
    Record<string, { file: File; durationSec: number }>
  >({});
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const sessionNavRef = useRef<HTMLElement>(null);

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
    setSessions(ensureSessionSlots(workoutData.sessions));

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

  useEffect(() => {
    const root = sessionNavRef.current;
    if (!root) return;
    const active = root.querySelector(".es-nav-item--active, .es-nav-item--here");
    active?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [nav]);

  useEffect(() => {
    if (!isSessionNav(nav)) {
      setSessionRecap(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/client/session-recap?session=${encodeURIComponent(String(nav))}`,
      );
      const data = (await res.json()) as { recap?: SessionRecap | null };
      if (!cancelled) setSessionRecap(data.recap ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  async function logout() {
    await fetch("/api/client/session", { method: "DELETE" });
    router.replace("/client/login");
  }

  async function submitTask(taskId: string, revise: boolean) {
    const task = tasks.find((row) => row.id === taskId);
    const driveLink = driveLinks[taskId] ?? "";
    const draft = drafts[taskId];
    const videoLink = task ? usesVideoLink(task) : false;
    const clientComplete =
      !revise &&
      task &&
      !task.recordingRequired &&
      !needsCoachReview(task);
    if (!revise && task?.recordingRequired && videoLink && !driveLink.trim()) {
      setError("Paste a Google Drive or YouTube link, then submit.");
      return;
    }
    if (!revise && task?.recordingRequired && !videoLink && !draft) {
      setError("Record audio first, then submit.");
      return;
    }
    if (!revise && !task?.recordingRequired && !clientComplete) {
      setError("This task is not ready to submit.");
      return;
    }
    if (revise && videoLink && !driveLink.trim()) {
      setError("Paste a Google Drive or YouTube link.");
      return;
    }
    if (revise && !videoLink && !draft) {
      setError("Record a new clip first.");
      return;
    }
    setBusyId(taskId);
    setError("");
    try {
      let storageId: string | undefined;
      if (draft && !videoLink) {
        const urlRes = await fetch("/api/client/workouts/upload", {
          method: "POST",
        });
        const urlData = (await urlRes.json()) as {
          uploadUrl?: string;
          error?: string;
        };
        if (!urlRes.ok || !urlData.uploadUrl) {
          throw new Error(urlData.error || "Could not start upload.");
        }
        const uploaded = await fetch(urlData.uploadUrl, {
          method: "POST",
          headers: { "Content-Type": draft.file.type || "audio/webm" },
          body: draft.file,
        });
        if (!uploaded.ok) throw new Error("Upload failed.");
        const stored = (await uploaded.json()) as { storageId?: string };
        if (!stored.storageId) throw new Error("Upload did not return a file id.");
        storageId = stored.storageId;
      }
      const res = await fetch("/api/client/workouts", {
        method: revise ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          driveUrl: videoLink ? driveLink.trim() || undefined : undefined,
          storageId,
          durationSec: draft?.durationSec,
          complete: clientComplete || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit.");
      setDriveLinks((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
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
  const sessionLocked =
    isSessionNav(nav) && !isClientSessionUnlocked(nav, row.currentStage);
  const selectedTasks = sessionLocked
    ? []
    : isSessionNav(nav)
      ? tasksForSession(tasks, nav)
      : [];
  const sessionComplete = isSessionComplete(selectedTasks);
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
    return task.title.trim() || `Task ${index + 1}`;
  }

  function sessionKicker() {
    if (sessionLocked && isSessionNav(nav)) {
      return `${row.name}, this session opens after you finish ${sessionLabel(previousProgramSession(nav))}.`;
    }
    if (sessionComplete) {
      return `${row.name}, this session has been completed.`;
    }
    if (nav === INTRO_SESSION) {
      if (!isIntroCallEmpty(intro)) {
        return `${row.name}, your Intro Call overview is below. Complete the baseline video task when you are ready.`;
      }
      return `${row.name}, paste a Google Drive or YouTube link for your baseline video. Your coach will write the diagnosis after the call.`;
    }
    if (selectedTasks.length === 0) {
      return `${row.name}, your coach will assign this session soon.`;
    }
    return `${row.name}, work through each step below. Record audio when a task asks for it, then wait for your coach review.`;
  }

  function renderTaskStep(task: CoachingTask, index: number, stepN?: number) {
    return (
      <SessionReportStep
        key={task.id}
        n={stepN ?? index + 1}
        title={stepTitle(task, index)}
      >
        <p>{task.instructions}</p>
        <TaskScreen
          task={task}
          driveLink={driveLinks[task.id] ?? task.driveUrl ?? ""}
          draft={drafts[task.id]}
          busy={busyId === task.id}
          showEmber={emberId === task.id}
          sessionComplete={sessionComplete}
          revising={revisingId === task.id}
          onDriveLink={(value) =>
            setDriveLinks((prev) => ({ ...prev, [task.id]: value }))
          }
          onDraft={(file, durationSec) =>
            setDrafts((prev) => ({ ...prev, [task.id]: { file, durationSec } }))
          }
          onSubmit={(revise) => void submitTask(task.id, revise)}
          onStartRevise={() => {
            setRevisingId(task.id);
            setDriveLinks((prev) => ({
              ...prev,
              [task.id]: prev[task.id] ?? task.driveUrl ?? "",
            }));
          }}
          onCancelRevise={() => {
            setRevisingId(null);
            setDriveLinks((prev) => {
              const next = { ...prev };
              delete next[task.id];
              return next;
            });
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
    <div className="es-client-shell">
      <aside className="es-client-aside">
        <div className="es-client-identity">
          <p className="es-wordmark">EliteSpeak</p>
          <div className="es-client-who">
            <p className="es-aside-name">{client.name}</p>
            <p className="es-aside-email">{client.email}</p>
            {client.currentFocus ? (
              <p className="es-aside-focus">{client.currentFocus}</p>
            ) : null}
          </div>
        </div>
        <nav ref={sessionNavRef} className="es-client-nav" aria-label="Sessions">
          <button
            type="button"
            onClick={() => setNav(INTRO_SESSION)}
            className={navClass(nav === INTRO_SESSION, introMilestone === "current")}
          >
            <span className="flex items-center gap-2">
              {introMilestone === "complete" ? (
                <span className="es-nav-tick">✓</span>
              ) : null}
              <span className="md:hidden">{sessionNavShort(INTRO_SESSION)}</span>
              <span className="hidden md:inline">Intro Call</span>
            </span>
            {introMilestone === "current" ? (
              <span className="es-nav-meta">Current session</span>
            ) : null}
          </button>
          {sessions.map((slot) => {
            const slotTasks = tasksForSession(tasks, slot.sessionNumber);
            const milestone = sessionMilestone(slot.sessionNumber, here, slotTasks);
            const locked = !isClientSessionUnlocked(
              slot.sessionNumber,
              row.currentStage,
            );
            return (
              <button
                key={slot.sessionNumber}
                type="button"
                onClick={() => setNav(slot.sessionNumber)}
                className={navClass(
                  nav === slot.sessionNumber,
                  milestone === "current",
                  locked,
                )}
              >
                <span className="flex items-center gap-2">
                  {milestone === "complete" ? (
                    <span className="es-nav-tick">✓</span>
                  ) : null}
                  <span className="md:hidden">
                    {sessionNavShort(slot.sessionNumber)}
                  </span>
                  <span className="hidden md:inline">
                    {sessionLabel(slot.sessionNumber)}
                  </span>
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
        <div className="es-client-bar-end">
          <div className="es-client-extra">
            <button
              type="button"
              onClick={() => setNav("linkedin")}
              aria-label={
                client.onboardingComplete ? "LinkedIn" : "Action required"
              }
              className={
                nav === "linkedin"
                  ? "es-nav-how es-nav-how--active"
                  : client.onboardingComplete
                    ? "es-nav-how"
                    : "es-nav-how es-nav-how--need"
              }
            >
              <LinkedInMark className="es-nav-how-icon" />
              <span className="es-nav-how-copy">
                {client.onboardingComplete ? "LinkedIn" : "Action required"}
              </span>
              {client.onboardingComplete ? (
                <span className="es-nav-tick">✓</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setNav("how-it-works")}
              aria-label="How It Works"
              className={
                nav === "how-it-works"
                  ? "es-nav-how es-nav-how--active"
                  : "es-nav-how"
              }
            >
              <CompassMark />
              <span className="es-nav-how-copy">How It Works</span>
            </button>
          </div>
          <div className="es-client-tools">
            <button
              type="button"
              onClick={() => void logout()}
              className="es-client-logout"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main
        className={
          nav === "how-it-works"
            ? "es-client-main es-client-main--roadmap"
            : "es-client-main"
        }
      >
        {nav === "how-it-works" ? (
          <HowItWorksRoadmap />
        ) : nav === "linkedin" ? (
          <SessionReport
            className="flex-1 es-report--linkedin"
            title="LinkedIn"
            kicker={
              row.onboardingComplete ? undefined : "Send your LinkedIn PDF."
            }
          >
            <LinkedInUpload
              name={row.name}
              done={row.onboardingComplete}
              onSaved={() => void load()}
            />
          </SessionReport>
        ) : (
          <SessionReport
            className={
              sessionLocked ||
              (selectedTasks.length === 0 &&
                nav !== INTRO_SESSION &&
                !sessionRecap?.recapSummary)
                ? "flex-1 es-report--empty"
                : "flex-1"
            }
            title={sessionLabel(nav)}
            kicker={sessionKicker()}
          >
            {nav === INTRO_SESSION && !isIntroCallEmpty(intro) ? (
              <SessionReportStep n={1} title="Intro Call Overview">
                <IntroCallView clientName={client.name} report={intro} />
              </SessionReportStep>
            ) : null}
            {isSessionNav(nav) &&
            nav >= 1 &&
            sessionRecap?.recapSummary ? (
              <SessionReportStep
                n={
                  nav === INTRO_SESSION && !isIntroCallEmpty(intro)
                    ? 2
                    : 1
                }
                title="Call overview"
              >
                <SessionRecapView
                  sessionLabel={sessionLabel(nav)}
                  recap={sessionRecap.recapSummary}
                />
              </SessionReportStep>
            ) : null}
            {sessionLocked ||
            (selectedTasks.length === 0 &&
              nav !== INTRO_SESSION &&
              !sessionRecap?.recapSummary) ? (
              <SessionWaiting
                sessionNumber={nav}
                lockNote={
                  sessionLocked && isSessionNav(nav)
                    ? `Opens after ${sessionLabel(previousProgramSession(nav))}.`
                    : undefined
                }
              />
            ) : (
              selectedTasks.map((task, index) => {
                let stepBase = 1;
                if (nav === INTRO_SESSION && !isIntroCallEmpty(intro)) stepBase += 1;
                if (
                  isSessionNav(nav) &&
                  nav >= 1 &&
                  sessionRecap?.recapSummary
                ) {
                  stepBase += 1;
                }
                return renderTaskStep(task, index, index + stepBase);
              })
            )}
          </SessionReport>
        )}
        {error ? (
          <p className="es-client-error" style={{ color: "var(--es-ember)" }}>
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
