"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AboutEliteSpeak } from "@/components/AboutEliteSpeak";
import { Ember } from "@/components/Ember";
import { ClientDiagnosisPanel } from "@/components/ClientDiagnosisPanel";
import { ProfilesMark, ProfilesUpload } from "@/components/ProfilesUpload";
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
  emptyLiveCallProgress,
  callCompletedForSession,
  type CoachingSessionSlot,
  type LiveCallProgress,
} from "@/lib/coaching-sessions";
import {
  LiveCallProgressBar,
  SessionBookCard,
} from "@/components/SessionBookCard";
import {
  INTRO_SESSION,
  WORK_SESSION_COUNT,
  groupedProgramSession,
  isClientSessionUnlocked,
  isFinalSession,
  parseCurrentStage,
  previousProgramSession,
  sessionLabel,
} from "@/lib/coaching-program";
import {
  usesVideoLink,
  type CoachingTask,
} from "@/lib/coaching-tasks";
import { videoShareKind } from "@/lib/google-drive";
import { isIntroCallEmpty, type IntroCallReport } from "@/lib/intro-call";
import type { SessionRecap } from "@/lib/session-recap";
import {
  formatExpectedTime,
  inferTaskExpectedMinutes,
} from "@/lib/workout-exercises";

type Milestone = "complete" | "current" | "upcoming";

type NavId = number | "how-it-works" | "linkedin" | "ai-diagnosis";

function stageToNav(stage: string | undefined, workSessionCount?: number): NavId {
  return groupedProgramSession(parseCurrentStage(stage, workSessionCount));
}

function navClass(active: boolean, here: boolean, locked = false): string {
  if (active) return "es-nav-item es-nav-item--active";
  if (here) return "es-nav-item es-nav-item--here";
  if (locked) return "es-nav-item es-nav-item--locked";
  return "es-nav-item";
}

function sessionNavShort(
  sessionNumber: number,
  workSessionCount?: number,
): string {
  if (sessionNumber === INTRO_SESSION) return "Intro + 1";
  if (isFinalSession(sessionNumber, workSessionCount)) return "Final";
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

function isClientTaskComplete(task: CoachingTask): boolean {
  return (
    task.status === "submitted" ||
    task.status === "reviewed" ||
    task.status === "done"
  );
}

function sessionTaskProgress(tasks: CoachingTask[]) {
  const total = tasks.length;
  const completed = tasks.filter(isClientTaskComplete).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, pct };
}

const TASK_SECTION_LABELS = [
  ["THIS WEEK", "This week"],
  ["WHY THIS DRILL", "Why this drill"],
  ["WHAT TO DO", "What to do"],
  ["PRACTICE FORMAT", "Practice format"],
  ["WHAT TO WATCH FOR", "What to watch for"],
  ["SUCCESS STANDARD", "Success standard"],
  ["EXAMPLE", "Example"],
  ["PROBLEM IT SOLVES", "Problem it solves"],
  ["PURPOSE", "Purpose"],
  ["INSTRUCTIONS", "Instructions"],
] as const;

const TASK_SECTION_LABEL_MAP = new Map<string, string>(TASK_SECTION_LABELS);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTaskInstructionSections(instructions: string) {
  const sectionPattern = new RegExp(
    `\\s*(${TASK_SECTION_LABELS.map(([label]) => escapeRegExp(label)).join("|")}):\\s*`,
    "gi",
  );

  const normalized = instructions
    .replace(/\r\n?/g, "\n")
    .replace(sectionPattern, (_match, label: string) => `\n${label.toUpperCase()}: `)
    .trim();

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Array<{ label: string; body: string[] }> = [];
  let current: { label: string; body: string[] } | null = null;

  for (const line of lines) {
    const colonSectionMatch = line.match(/^([A-Za-z][A-Za-z ]+):\s*(.*)$/);
    const bareSectionKey = line.replace(/:$/, "").trim().toUpperCase();

    if (
      colonSectionMatch &&
      TASK_SECTION_LABEL_MAP.has(colonSectionMatch[1].trim().toUpperCase())
    ) {
      if (current) sections.push(current);
      current = {
        label:
          TASK_SECTION_LABEL_MAP.get(colonSectionMatch[1].trim().toUpperCase()) ??
          colonSectionMatch[1].trim(),
        body: colonSectionMatch[2] ? [colonSectionMatch[2].trim()] : [],
      };
      continue;
    }

    if (TASK_SECTION_LABEL_MAP.has(bareSectionKey)) {
      if (current) sections.push(current);
      current = {
        label: TASK_SECTION_LABEL_MAP.get(bareSectionKey) ?? bareSectionKey,
        body: [],
      };
      continue;
    }

    if (!current) {
      current = { label: "Instructions", body: [line] };
      continue;
    }
    current.body.push(line);
  }

  if (current) sections.push(current);
  return sections;
}

function TaskInstructionCopy({ instructions }: { instructions: string }) {
  const sections = parseTaskInstructionSections(instructions);

  return (
    <div className="es-task-copy">
      {sections.map((section, index) => (
        <section key={`${section.label}-${index}`} className="es-task-section">
          <p className="es-task-section-label">{section.label}</p>
          <p className="es-task-section-body">{section.body.join("\n")}</p>
        </section>
      ))}
    </div>
  );
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

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="es-mobile-menu-icon" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
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
  readOnly = false,
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
  readOnly?: boolean;
  onDriveLink: (value: string) => void;
  onDraft: (file: File, durationSec: number) => void;
  onSubmit: (revise: boolean) => void;
  onStartRevise: () => void;
  onCancelRevise: () => void;
}) {
  const videoLink = usesVideoLink(task);
  if (readOnly && task.status === "open") {
    return (
      <div className="es-task-well">
        <p className="es-task-hint">Demo preview — sign in to submit your own work.</p>
      </div>
    );
  }
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
      return (
        <div className="es-task-well">
          <p className="es-task-hint">
            Finish this task, then mark it complete here.
          </p>
          <div className="es-task-controls">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmit(false)}
              className="es-btn"
            >
              {busy ? "Completing…" : "Complete task"}
            </button>
          </div>
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

  if (task.status === "reviewed" || task.status === "done") {
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

  return null;
}

export function ClientPortalHome({ demoMode = false }: { demoMode?: boolean }) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [client, setClient] = useState<ClientSession | null>(null);
  const [tasks, setTasks] = useState<CoachingTask[]>([]);
  const [sessions, setSessions] = useState<CoachingSessionSlot[]>(emptySessionSlots);
  const [intro, setIntro] = useState<IntroCallReport | null>(null);
  const [sessionRecap, setSessionRecap] = useState<SessionRecap | null>(null);
  const [sessionView, setSessionView] = useState<"tasks" | "summary">("tasks");
  const [nav, setNav] = useState<NavId>(INTRO_SESSION);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [driveLinks, setDriveLinks] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<
    Record<string, { file: File; durationSec: number }>
  >({});
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [callProgress, setCallProgress] = useState<LiveCallProgress | null>(null);
  const sessionNavRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    if (demoMode) {
      const demoRes = await fetch("/api/client/demo");
      const demoData = (await demoRes.json()) as {
        error?: string;
        client?: ClientSession | null;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
        intro?: IntroCallReport | null;
        progress?: LiveCallProgress;
      };
      if (!demoRes.ok || !demoData.client) {
        setError(demoData.error || "Could not load demo.");
        return null;
      }
      setClient(demoData.client);
      setTasks(demoData.tasks || []);
      setSessions(
        ensureSessionSlots(
          demoData.sessions,
          demoData.client.workSessionCount ?? WORK_SESSION_COUNT,
        ),
      );
      setIntro(demoData.intro ?? null);
      setCallProgress(demoData.progress ?? emptyLiveCallProgress());
      setError("");
      return demoData.client;
    }

    const sessionRes = await fetch("/api/client/session");
    const sessionData = (await sessionRes.json()) as {
      authenticated?: boolean;
      needsRegistration?: boolean;
      client?: ClientSession | null;
    };
    if (!sessionRes.ok || !sessionData.authenticated) {
      router.replace("/client/login");
      return;
    }
    if (sessionData.needsRegistration) {
      router.replace("/client/register");
      return;
    }
    if (!sessionData.client || sessionData.client.status === "pending") {
      router.replace("/client/waiting");
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
      ensureSessionSlots(
        workoutData.sessions,
        sessionData.client.workSessionCount ?? WORK_SESSION_COUNT,
      ),
    );

    const introRes = await fetch("/api/client/intro-call");
    const introData = (await introRes.json()) as {
      report?: IntroCallReport | null;
    };
    setIntro(introData.report ?? null);

    const progressRes = await fetch("/api/client/live-calls");
    const progressData = (await progressRes.json()) as {
      progress?: LiveCallProgress;
    };
    if (progressRes.ok && progressData.progress) {
      setCallProgress(progressData.progress);
    } else {
      setCallProgress(emptyLiveCallProgress());
    }

    setError("");
    return sessionData.client;
  }, [demoMode, router]);

  useEffect(() => {
    void load().then((row) => {
      if (row) setNav(stageToNav(row.currentStage, row.workSessionCount ?? WORK_SESSION_COUNT));
    });
  }, [load]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

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
    setSessionView("tasks");
    const recapSession = nav === INTRO_SESSION ? 1 : nav;
    let cancelled = false;
    void (async () => {
      const recapUrl = demoMode
        ? `/api/client/demo/session-recap?session=${encodeURIComponent(String(recapSession))}`
        : `/api/client/session-recap?session=${encodeURIComponent(String(recapSession))}`;
      const res = await fetch(recapUrl);
      const data = (await res.json()) as { recap?: SessionRecap | null };
      if (!cancelled) setSessionRecap(data.recap ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode, nav]);

  async function logout() {
    await signOut();
    router.replace("/client/login");
  }

  async function submitTask(taskId: string, revise: boolean) {
    const task = tasks.find((row) => row.id === taskId);
    const driveLink = driveLinks[taskId] ?? "";
    const draft = drafts[taskId];
    const videoLink = task ? usesVideoLink(task) : false;
    if (!revise && task?.recordingRequired && videoLink && !driveLink.trim()) {
      setError("Paste a Google Drive or YouTube link, then submit.");
      return;
    }
    if (!revise && task?.recordingRequired && !videoLink && !draft) {
      setError("Record audio first, then submit.");
      return;
    }
    if (!revise && !task?.recordingRequired) {
      setError("");
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
          complete: !revise && !task?.recordingRequired ? true : undefined,
          driveUrl: videoLink ? driveLink.trim() || undefined : undefined,
          storageId,
          durationSec: draft?.durationSec,
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
  const workCount = row.workSessionCount ?? WORK_SESSION_COUNT;
  const actualHere = parseCurrentStage(row.currentStage, workCount);
  const here = stageToNav(row.currentStage, workCount);
  const publishedTasks = isSessionNav(nav)
    ? nav === INTRO_SESSION
      ? [
          ...tasksForSession(tasks, INTRO_SESSION),
          ...tasksForSession(tasks, 1),
        ]
      : tasksForSession(tasks, nav)
    : [];
  const hasPublishedSessionContent =
    publishedTasks.length > 0 ||
    (nav === INTRO_SESSION
      ? !isIntroCallEmpty(intro)
      : Boolean(sessionRecap?.recapSummary.trim()));
  const sessionLocked =
    !demoMode &&
    isSessionNav(nav) &&
    !isClientSessionUnlocked(nav, row.currentStage, workCount) &&
    !hasPublishedSessionContent;
  const selectedTasks = sessionLocked ? [] : publishedTasks;
  const activeExpandedTaskId = selectedTasks.some((task) => task.id === expandedTaskId)
    ? expandedTaskId
    : null;
  const sessionComplete = isSessionComplete(selectedTasks);
  const emberId = liveTaskId(
    selectedTasks.filter((task) => task.recordingRequired),
  );
  const introTasks = [
    ...tasksForSession(tasks, INTRO_SESSION),
    ...tasksForSession(tasks, 1),
  ];
  const introDone =
    !isIntroCallEmpty(intro) &&
    (introTasks.length === 0 || isSessionComplete(introTasks));
  const introMilestone: Milestone =
    introDone && actualHere > 1
      ? "complete"
      : actualHere <= 1
        ? "current"
        : "upcoming";

  function stepTitle(task: CoachingTask, index: number) {
    return task.title.trim() || `Task ${index + 1}`;
  }

  function taskStatusChip(task: CoachingTask) {
    if (task.status === "submitted") {
      return (
        <span className="es-report-step-status es-report-step-status--review">
          In review
        </span>
      );
    }
    if (task.status === "reviewed" || task.status === "done") {
      return (
        <span className="es-report-step-status es-report-step-status--done">
          Completed
        </span>
      );
    }
    return <span className="es-report-step-status">Open</span>;
  }

  function sessionKicker() {
    if (sessionLocked && isSessionNav(nav)) {
      return undefined;
    }
    if (sessionComplete) {
      return `${row.name}, this session has been completed.`;
    }
    if (nav === INTRO_SESSION) {
      if (!isIntroCallEmpty(intro)) {
        return `${row.name}, your Intro Call + Session 1 overview is below. Complete each practice task when you are ready.`;
      }
      return `${row.name}, paste a Google Drive or YouTube link for your baseline video. Your coach will write the SpeechMap report after the call.`;
    }
    if (selectedTasks.length === 0) {
      return undefined;
    }
    return `${row.name}, work through each step below. Record audio when a task asks for it, then wait for your coach review.`;
  }

  function renderTaskStep(
    task: CoachingTask,
    index: number,
    stepN?: number,
    locked = false,
    open = true,
    onToggle?: () => void,
  ) {
    const expected = formatExpectedTime(
      inferTaskExpectedMinutes({
        title: task.title,
        instructions: task.instructions,
        expectedMinutes: task.expectedMinutes,
      }),
    );
  if (locked) {
    return (
      <SessionReportStep
        key={task.id}
        n={stepN ?? index + 1}
        title={stepTitle(task, index)}
        open={open}
        onToggle={onToggle}
        meta={taskStatusChip(task)}
      >
        <div className="es-task-locked">
          <p className="es-task-locked-title">Locked</p>
          <p className="es-task-locked-copy">
            Complete Task {index} to unlock this step.
          </p>
        </div>
      </SessionReportStep>
    );
  }
    return (
      <SessionReportStep
        key={task.id}
        n={stepN ?? index + 1}
        title={stepTitle(task, index)}
        open={open}
        onToggle={onToggle}
      >
        <div className="es-task-sheet">
          {expected ? (
            <p className="es-task-expected">Expected time: {expected}</p>
          ) : null}
          <div className="es-task-badges">
            <span
              className={`es-task-pill ${task.recordingRequired ? "es-task-pill--audio" : ""}`}
            >
              {task.recordingRequired ? <span className="es-task-pill-dot" /> : null}
              Audio required: {task.recordingRequired ? "Yes" : "No"}
            </span>
          </div>
          <TaskInstructionCopy instructions={task.instructions} />
          <TaskScreen
            task={task}
            driveLink={driveLinks[task.id] ?? task.driveUrl ?? ""}
            draft={drafts[task.id]}
            busy={busyId === task.id}
            showEmber={emberId === task.id}
            sessionComplete={sessionComplete}
            revising={revisingId === task.id}
            readOnly={demoMode}
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
        </div>
      </SessionReportStep>
    );
  }

  return (
    <div className="es-client-shell">
      <aside className="es-client-aside">
        <div className="es-client-mobile-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="es-wordmark-image es-wordmark-image--mobile"
            src="/client/elitespeak-wordmark.png"
            alt="EliteSpeak"
          />
          <div className="es-mobile-menu-entry">
            <button
              type="button"
              className="es-mobile-menu-btn"
              aria-expanded={mobileMenuOpen}
              aria-controls="es-client-mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <>
            <button
              type="button"
              className="es-mobile-menu-backdrop"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav
              id="es-client-mobile-menu"
              className="es-mobile-menu-panel"
              aria-label="Account menu"
            >
              <button
                type="button"
                className="es-mobile-menu-close"
                onClick={() => setMobileMenuOpen(false)}
              >
                Close ←
              </button>
              <p className="es-mobile-menu-name">{client.name}</p>
              {client.email ? (
                <p className="es-mobile-menu-email">{client.email}</p>
              ) : null}
              <div className="es-mobile-menu-progress">
                <LiveCallProgressBar progress={callProgress} />
              </div>
              <div className="es-mobile-menu-section">
                <p className="es-mobile-menu-label">Sessions</p>
                <button
                  type="button"
                  className={
                    nav === INTRO_SESSION
                      ? "es-mobile-menu-item es-mobile-menu-item--active"
                      : introMilestone === "current"
                        ? "es-mobile-menu-item es-mobile-menu-item--current"
                        : "es-mobile-menu-item"
                  }
                  onClick={() => {
                    setNav(INTRO_SESSION);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span>{sessionLabel(INTRO_SESSION, workCount)}</span>
                  {introMilestone === "current" ? (
                    <span className="es-mobile-menu-item-meta">Current</span>
                  ) : null}
                </button>
                {sessions
                  .filter((slot) => slot.sessionNumber !== 1)
                  .map((slot) => {
                  const slotTasks = tasksForSession(tasks, slot.sessionNumber);
                  const milestone = sessionMilestone(
                    slot.sessionNumber,
                    here,
                    slotTasks,
                  );
                  const locked =
                    !demoMode &&
                    !isClientSessionUnlocked(
                      slot.sessionNumber,
                      row.currentStage,
                      workCount,
                    ) &&
                    slotTasks.length === 0;
                  return (
                    <button
                      key={`mobile-${slot.sessionNumber}`}
                      type="button"
                      onClick={() => {
                        setNav(slot.sessionNumber);
                        setMobileMenuOpen(false);
                      }}
                      className={
                        nav === slot.sessionNumber
                          ? "es-mobile-menu-item es-mobile-menu-item--active"
                          : locked
                            ? "es-mobile-menu-item es-mobile-menu-item--locked"
                            : milestone === "current"
                              ? "es-mobile-menu-item es-mobile-menu-item--current"
                              : "es-mobile-menu-item"
                      }
                    >
                      <span>{sessionLabel(slot.sessionNumber, workCount)}</span>
                      {milestone === "current" ? (
                        <span className="es-mobile-menu-item-meta">
                          {client.reviewRequired ? "In review" : "Current"}
                        </span>
                      ) : null}
                    </button>
                  );
                  })}
              </div>
              <button
                type="button"
                className="es-mobile-menu-item"
                onClick={() => {
                  setNav("ai-diagnosis");
                  setMobileMenuOpen(false);
                }}
              >
                SpeechMap Reports
              </button>
              <button
                type="button"
                className={
                  client.onboardingComplete
                    ? "es-mobile-menu-item"
                    : "es-mobile-menu-item es-mobile-menu-item--need"
                }
                onClick={() => {
                  setNav("linkedin");
                  setMobileMenuOpen(false);
                }}
              >
                Profiles
              </button>
              <button
                type="button"
                className="es-mobile-menu-item"
                onClick={() => {
                  setNav("how-it-works");
                  setMobileMenuOpen(false);
                }}
              >
                About EliteSpeak
              </button>
              {demoMode ? (
                <a
                  href="/client/login"
                  className="es-mobile-menu-item es-mobile-menu-item--logout"
                >
                  Client login
                </a>
              ) : (
                <button
                  type="button"
                  className="es-mobile-menu-item es-mobile-menu-item--logout"
                  onClick={() => void logout()}
                >
                  Log out
                </button>
              )}
            </nav>
          </>
        ) : null}

        {demoMode ? (
          <div className="es-demo-banner es-client-desktop-only">
            <p className="es-demo-banner-title">Sample demo</p>
            <p className="es-demo-banner-copy">
              Read-only preview.{" "}
              <a href="/client/login">Sign in</a> for your own program.
            </p>
          </div>
        ) : null}

        <div className="es-client-identity es-client-desktop-only">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="es-wordmark-image"
            src="/client/elitespeak-wordmark.png"
            alt="EliteSpeak"
          />
          <div className="es-client-who">
            <p className="es-aside-name">{client.name}</p>
            <p className="es-aside-email">{client.email}</p>
            {client.currentFocus ? (
              <p className="es-aside-focus">{client.currentFocus}</p>
            ) : null}
          </div>
          <LiveCallProgressBar progress={callProgress} />
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
              <span className="md:hidden">{sessionNavShort(INTRO_SESSION, workCount)}</span>
              <span className="hidden md:inline">
                {sessionLabel(INTRO_SESSION, workCount)}
              </span>
            </span>
            {introMilestone === "current" ? (
              <span className="es-nav-meta">Current session</span>
            ) : null}
          </button>
          {sessions
            .filter((slot) => slot.sessionNumber !== 1)
            .map((slot) => {
            const slotTasks = tasksForSession(tasks, slot.sessionNumber);
            const milestone = sessionMilestone(slot.sessionNumber, here, slotTasks);
            const locked =
              !demoMode &&
              !isClientSessionUnlocked(
                slot.sessionNumber,
                row.currentStage,
                workCount,
              ) &&
              slotTasks.length === 0;
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
                    {sessionNavShort(slot.sessionNumber, workCount)}
                  </span>
                  <span className="hidden md:inline">
                    {sessionLabel(slot.sessionNumber, workCount)}
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
        <div className="es-client-bar-end es-client-desktop-only">
          <div className="es-client-extra">
            <button
              type="button"
              onClick={() => setNav("ai-diagnosis")}
              aria-label="SpeechMap Reports"
              className={
                nav === "ai-diagnosis"
                  ? "es-nav-how es-nav-how--active"
                  : "es-nav-how"
              }
            >
              <span className="es-nav-how-copy">SpeechMap Reports</span>
            </button>
            <button
              type="button"
              onClick={() => setNav("linkedin")}
              aria-label={
                "Profiles"
              }
              className={
                nav === "linkedin"
                  ? "es-nav-how es-nav-how--active"
                  : client.onboardingComplete
                    ? "es-nav-how"
                    : "es-nav-how es-nav-how--need"
              }
            >
              <ProfilesMark className="es-nav-how-icon" />
              <span className="es-nav-how-copy">Profiles</span>
              {client.onboardingComplete ? (
                <span className="es-nav-tick">✓</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setNav("how-it-works")}
              aria-label="About EliteSpeak"
              className={
                nav === "how-it-works"
                  ? "es-nav-how es-nav-how--active"
                  : "es-nav-how"
              }
            >
              <CompassMark />
              <span className="es-nav-how-copy">About EliteSpeak</span>
            </button>
          </div>
          <div className="es-client-tools">
            {demoMode ? (
              <a href="/client/login" className="es-client-logout">
                Client login
              </a>
            ) : (
              <button
                type="button"
                onClick={() => void logout()}
                className="es-client-logout"
              >
                Log out
              </button>
            )}
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
        {demoMode ? (
          <div className="es-demo-banner es-demo-banner--mobile">
            <p className="es-demo-banner-title">Sample demo</p>
            <p className="es-demo-banner-copy">
              Read-only preview.{" "}
              <a href="/client/login">Sign in</a> for your own program.
            </p>
          </div>
        ) : null}
        {nav === "how-it-works" ? (
          <AboutEliteSpeak />
        ) : nav === "ai-diagnosis" ? (
          <SessionReport
            className="flex-1 es-report--diagnosis"
            title="SpeechMap Reports"
            kicker="Record your voice and compare your reports over time."
          >
            <ClientDiagnosisPanel readOnly={demoMode} />
          </SessionReport>
        ) : nav === "linkedin" ? (
          <SessionReport
            className="flex-1 es-report--linkedin"
            title="Profiles"
            kicker={
              row.onboardingComplete
                ? undefined
                : "Share your professional and social profiles."
            }
          >
            <ProfilesUpload
              name={row.name}
              submitted={row.onboardingComplete}
              initialProfiles={row.socialProfiles}
              readOnly={demoMode}
              onSaved={() => {
                if (!demoMode) void load();
              }}
            />
          </SessionReport>
        ) : (
          <SessionReport
            className={
              // Book card needs a normal top-aligned report; empty layout clips the title.
              sessionView === "tasks" &&
              !isSessionNav(nav) &&
              (sessionLocked ||
                (selectedTasks.length === 0 && nav !== INTRO_SESSION))
                ? "flex-1 es-report--empty"
                : "flex-1"
            }
            title={sessionLabel(nav, workCount)}
            kicker={sessionKicker()}
          >
            {isSessionNav(nav) ? (
              <SessionBookCard
                sessionNumber={nav}
                completed={
                  callCompletedForSession(callProgress, nav) ||
                  Boolean(
                    sessions.find((slot) => slot.sessionNumber === nav)
                      ?.callCompleted,
                  )
                }
                completedAt={
                  callProgress?.calls.find((c) => c.sessionNumber === nav)
                    ?.completedAt ||
                  sessions.find((slot) => slot.sessionNumber === nav)
                    ?.callCompletedAt
                }
                readOnly={demoMode}
              />
            ) : null}
            {nav === INTRO_SESSION &&
            sessionView === "tasks" &&
            !isIntroCallEmpty(intro) ? (
              <IntroCallView clientName={client.name} report={intro} />
            ) : null}
            {isSessionNav(nav) ? (
              <div className="es-session-tabs" role="tablist" aria-label="Session view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sessionView === "tasks"}
                  className={
                    sessionView === "tasks"
                      ? "es-session-tab es-session-tab--active"
                      : "es-session-tab"
                  }
                  onClick={() => setSessionView("tasks")}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sessionView === "summary"}
                  className={
                    sessionView === "summary"
                      ? "es-session-tab es-session-tab--active"
                      : "es-session-tab"
                  }
                  onClick={() => setSessionView("summary")}
                >
                  Summary
                </button>
              </div>
            ) : null}
            {isSessionNav(nav) &&
            sessionView === "summary" ? (
              sessionRecap?.recapSummary ? (
                <SessionRecapView
                  sessionLabel={sessionLabel(nav, workCount)}
                  recap={sessionRecap.recapSummary}
                />
              ) : (
                <p className="es-session-summary-empty">
                  Your coach will add a call summary after your session.
                </p>
              )
            ) : null}
            {sessionView === "tasks" &&
            (sessionLocked ||
            (selectedTasks.length === 0 && nav !== INTRO_SESSION)) ? (
              <SessionWaiting
                sessionNumber={nav}
                awaitingCoach={
                  !sessionLocked &&
                  isSessionNav(nav) &&
                  selectedTasks.length === 0
                }
                lockNote={
                  sessionLocked && isSessionNav(nav)
                    ? `Opens after ${sessionLabel(
                        groupedProgramSession(
                          previousProgramSession(nav, workCount),
                        ),
                        workCount,
                      )}.`
                    : undefined
                }
              />
            ) : sessionView === "tasks" ? (
              <>
                {selectedTasks.length > 0 ? (
                  <div className="es-session-progress">
                    <div className="es-session-progress-head">
                      <span className="es-session-progress-pct">
                        {sessionTaskProgress(selectedTasks).pct}% complete
                      </span>
                      <span className="es-session-progress-count">
                        {sessionTaskProgress(selectedTasks).completed} of{" "}
                        {sessionTaskProgress(selectedTasks).total} tasks done
                      </span>
                    </div>
                    <div className="es-session-progress-track">
                      <div
                        className="es-session-progress-fill"
                        style={{
                          width: `${sessionTaskProgress(selectedTasks).pct}%`,
                        }}
                      />
                    </div>
                    {sessionTaskProgress(selectedTasks).pct < 100 ? (
                      <p className="es-session-progress-hint">
                        Submitted work counts here. Coach review will still show as
                        pending when needed.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {selectedTasks.map((task, index) => {
                  let stepBase = 1;
                  if (nav === INTRO_SESSION && !isIntroCallEmpty(intro)) {
                    stepBase += 1;
                  }
                  return renderTaskStep(
                    task,
                    index,
                    index + stepBase,
                    false,
                    task.id === activeExpandedTaskId,
                    () =>
                      setExpandedTaskId((current) =>
                        current === task.id ? null : task.id,
                      ),
                  );
                })}
              </>
            ) : null}
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

export default function ClientHomePage() {
  return <ClientPortalHome />;
}
