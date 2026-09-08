"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IntroCallView } from "@/components/IntroCallView";
import { AdminReadOnly, ViewerReadOnlyBanner } from "@/components/AdminReadOnly";
import { useAdminStaff } from "@/components/AdminShell";
import { TranscriptToWorkoutPanel } from "@/components/TranscriptToWorkoutPanel";
import type { CoachingClient } from "@/lib/coaching-clients";
import {
  parseLinkedInProfile} from "@/lib/linkedin-profile";
import { formatLinkedInPdfText } from "@/lib/pdf-text";
import {
  INTRO_SESSION,
  MAX_WORK_SESSION_COUNT,
  WORK_SESSION_COUNT,
  groupedProgramSession,
  isFinalSession,
  isMiddleWorkSession,
  parseCurrentStage,
  programSlots,
  sessionHeadline,
  sessionLabel,
  sessionMilestoneLine,
} from "@/lib/coaching-program";
import type { CoachingSessionSlot } from "@/lib/coaching-sessions";
import {
  isTaskFinished,
  needsCoachReview,
  taskStatusLabel,
  usesVideoLink,
  type CoachingTask} from "@/lib/coaching-tasks";
import { videoShareKind } from "@/lib/google-drive";
import {
  emptyIntroCall,
  isIntroCallEmpty,
  type IntroCallReport} from "@/lib/intro-call";

function AdminLinkedInDrawer({
  client,
  open,
  onClose}: {
  client: CoachingClient;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const profile = parseLinkedInProfile(client.linkedinProfileJson);
  const text = client.linkedinText?.trim() || "";
  const blocks = text ? formatLinkedInPdfText(text) : [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close profiles"
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[42rem] flex-col border-l border-border bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-7 py-6">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
              Profiles
            </p>
            <p className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
              {profile?.fullName || client.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className={adminUi.btnGhost}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-10 overflow-y-auto px-7 py-8">
          {!client.onboardingComplete ? (
            <p className="text-2xl font-extrabold text-amber-800">
              Profiles not submitted yet.
            </p>
          ) : (
            <>
              {client.socialProfiles.length > 0 ? (
                <section>
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted">
                    Submitted profiles
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {client.socialProfiles.map((value) => (
                      <li
                        key={value}
                        className="break-all rounded-xl border border-border bg-slate-50 px-4 py-3 text-base"
                      >
                        {value}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {profile?.headline || profile?.location ? (
                <div>
                  {profile.headline ? (
                    <p className="text-2xl font-extrabold leading-snug text-slate-900">
                      {profile.headline}
                    </p>
                  ) : null}
                  {profile.location ? (
                    <p className="mt-1 text-lg font-semibold text-muted">
                      {profile.location}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {profile?.about ? (
                <div>
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                    About
                  </p>
                  <p className="mt-3 text-2xl font-semibold leading-relaxed text-slate-800">
                    {profile.about}
                  </p>
                </div>
              ) : null}
              {profile && profile.experience.length > 0 ? (
                <div>
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Experience
                  </p>
                  <ul className="mt-5 space-y-8">
                    {profile.experience.map((job, i) => (
                      <li key={`${job.company}-${job.title}-${i}`}>
                        <p className="text-2xl font-extrabold leading-snug text-slate-900">
                          {job.title || "Role"}
                        </p>
                        {job.company ? (
                          <p className="mt-1 text-xl font-bold text-slate-800">
                            {job.company}
                          </p>
                        ) : null}
                        {job.dates ? (
                          <p className="mt-1 text-base font-semibold text-muted">
                            {job.dates}
                          </p>
                        ) : null}
                        {job.description ? (
                          <p className="mt-3 text-xl font-semibold leading-relaxed text-slate-800">
                            {job.description}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profile && profile.education.length > 0 ? (
                <div>
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Education
                  </p>
                  <ul className="mt-5 space-y-4">
                    {profile.education.map((row, i) => (
                      <li key={`${row.school}-${i}`}>
                        <p className="text-2xl font-extrabold text-slate-900">
                          {row.school || "School"}
                        </p>
                        {row.degree ? (
                          <p className="mt-1 text-xl font-bold text-slate-800">
                            {row.degree}
                          </p>
                        ) : null}
                        {row.dates ? (
                          <p className="mt-1 text-base font-semibold text-muted">
                            {row.dates}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profile && profile.skills.length > 0 ? (
                <div>
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Skills
                  </p>
                  <p className="mt-3 text-xl font-bold leading-relaxed text-slate-800">
                    {profile.skills.join(" · ")}
                  </p>
                </div>
              ) : null}
              {blocks.length > 0 ? (
                <div className="space-y-5 border-t border-border pt-8">
                  <p className="text-base font-extrabold uppercase tracking-wide text-muted">
                    From the PDF
                  </p>
                  {blocks.map((block) => (
                    <div key={block.heading}>
                      <p className="text-lg font-extrabold text-slate-700">
                        {block.heading}
                      </p>
                      <div className="mt-2 space-y-2">
                        {block.paragraphs.map((para, i) => (
                          <p
                            key={`${block.heading}-${i}`}
                            className="text-base leading-relaxed text-slate-600"
                          >
                            {para}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !profile && client.onboardingComplete ? (
                <p className="text-xl text-muted">
                  PDF is saved. The parsed profile is empty — check that Gemini
                  ran on upload.
                </p>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function TaskRequirementsField({
  recordingRequired,
  onRecordingRequired,
  video}: {
  recordingRequired: boolean;
  onRecordingRequired: (value: boolean) => void;
  video: boolean;
}) {
  const recordHint = video
    ? "Client pastes a Drive or YouTube link."
    : "Client records audio in the app.";
  return (
    <fieldset>
      <legend className="text-base font-semibold">Task requirements</legend>
      <div className="mt-3 space-y-3 rounded-xl border border-border bg-slate-50/60 px-4 py-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={recordingRequired}
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
                : "Client does written practice only. No recording required."}
            </span>
          </span>
        </label>
        <p className="text-sm text-muted">
          Audio submissions automatically move to In review. Written tasks
          complete immediately.
        </p>
      </div>
    </fieldset>
  );
}

function navRowClass(
  open: boolean,
  kind: "current" | "review" | "complete" | "idle",
): string {
  const base =
    "w-full rounded-xl border px-3.5 py-2.5 text-left border-l-4 transition";
  if (open) {
    return `${base} border-slate-200 border-l-teal-700 bg-slate-50`;
  }
  if (kind === "review") {
    return `${base} border-amber-200 border-l-amber-500 bg-amber-50`;
  }
  if (kind === "current") {
    return `${base} border-teal-200 border-l-teal-600 bg-teal-50/70`;
  }
  if (kind === "complete") {
    return `${base} border-border border-l-slate-300`;
  }
  return `${base} border-border border-l-transparent text-slate-500`;
}

const ADMIN_SESSION_KEY = "ca_admin_password";

const adminUi = {
  brand: "text-teal-700",
  link: "text-teal-700 hover:text-teal-900",
  focus: "focus:border-teal-500 focus:ring-teal-500/20",
  primaryBtn:
    "inline-flex min-h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-base font-bold text-white disabled:opacity-55",
  btnGhost:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-55",
  btnSolid:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-55",
  btnDanger:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 bg-white px-4 text-base font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-55",
  dangerText: "text-rose-600",
  dangerBtn: "text-rose-700 hover:text-rose-800",
  field:
    "w-full rounded-xl border border-border px-3.5 py-3 text-base outline-none"} as const;

function tasksForSession(tasks: CoachingTask[], sessionNumber: number) {
  return tasks
    .filter((task) => (task.sessionNumber ?? 1) === sessionNumber)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function sessionTone(
  sessionNumber: number,
  currentStage: string,
  sessionTasks: CoachingTask[],
  introSaved: IntroCallReport | null,
  workSessionCount: number = WORK_SESSION_COUNT,
): "current" | "review" | "complete" | "idle" {
  const here =
    groupedProgramSession(parseCurrentStage(currentStage, workSessionCount)) ===
    groupedProgramSession(sessionNumber);
  const needsReview = sessionTasks.some(
    (task) => task.status === "submitted" && needsCoachReview(task),
  );
  const complete =
    sessionNumber === INTRO_SESSION
      ? (sessionTasks.length > 0 &&
          sessionTasks.every(
            (task) => task.status === "reviewed" || task.status === "done",
          ) &&
          !isIntroCallEmpty(introSaved)) ||
        (!sessionTasks.length && !isIntroCallEmpty(introSaved) && !here)
      : sessionTasks.length > 0 &&
        sessionTasks.every(
          (task) => task.status === "reviewed" || task.status === "done",
        );
  if (needsReview) return "review";
  if (here) return "current";
  if (complete) return "complete";
  return "idle";
}

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const { canEdit } = useAdminStaff();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<CoachingClient | null>(null);
  const [tasks, setTasks] = useState<CoachingTask[]>([]);
  const [sessions, setSessions] = useState<CoachingSessionSlot[]>([]);
  const [assignSession, setAssignSession] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState(INTRO_SESSION);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [intro, setIntro] = useState(emptyIntroCall());
  const [introSaved, setIntroSaved] = useState<IntroCallReport | null>(null);
  const [introBusy, setIntroBusy] = useState(false);
  const [editingIntro, setEditingIntro] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesBusy, setNotesBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [recordingRequired, setRecordingRequired] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null | undefined>();
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editRecordingRequired, setEditRecordingRequired] = useState(false);

  const load = useCallback(async () => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`);
        const data = (await res.json()) as {
          error?: string;
          client?: CoachingClient;
          tasks?: CoachingTask[];
          sessions?: CoachingSessionSlot[];
        };
        if (!res.ok) throw new Error(data.error || "Could not load client.");
        setClient(data.client ?? null);
        setTasks(data.tasks || []);
        setSessions(data.sessions || []);
        const workCount =
          data.client?.workSessionCount ?? WORK_SESSION_COUNT;
        setSelectedSession(
          groupedProgramSession(
            parseCurrentStage(data.client?.currentStage, workCount),
          ),
        );

        const introRes = await fetch(
          `/api/admin/intro-call?clientId=${encodeURIComponent(clientId)}`,
        );
        const introData = (await introRes.json()) as {
          error?: string;
          report?: IntroCallReport | null;
        };
        if (!introRes.ok) throw new Error(introData.error || "Could not load intro call.");
        if (introData.report) {
          setIntroSaved(introData.report);
          setIntro({
            clientId,
            summary: introData.report.summary,
            challenges: introData.report.challenges.length
              ? introData.report.challenges
              : [{ title: "", body: "" }],
            coachingSchedule: introData.report.coachingSchedule,
            osItems: introData.report.osItems.length
              ? introData.report.osItems
              : [{ name: "", goal: "", body: "" }],
            reps: introData.report.reps.length
              ? introData.report.reps
              : [{ title: "", body: "" }]});
        } else {
          setIntroSaved(null);
          setIntro(emptyIntroCall(clientId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load.");
      } finally {
        setBusy(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const notesSession = selectedSession === INTRO_SESSION ? 1 : selectedSession;
    const slot = sessions.find((s) => s.sessionNumber === notesSession);
    setNotesDraft(slot?.adminNotes ?? "");
  }, [selectedSession, sessions]);

  async function onSaveIntro(e: FormEvent) {
    e.preventDefault();
    setIntroBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intro-call", {
        method: "PUT",
        headers: {
          "content-type": "application/json"},
        body: JSON.stringify({
          clientId,
          summary: intro.summary,
          challenges: intro.challenges,
          coachingSchedule: intro.coachingSchedule,
          osItems: intro.osItems,
          reps: intro.reps})});
      const data = (await res.json()) as {
        error?: string;
        report?: IntroCallReport | null;
      };
      if (!res.ok) throw new Error(data.error || "Could not save intro call.");
      setIntroSaved(data.report ?? null);
      setEditingIntro(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIntroBusy(false);
    }
  }

  async function refreshTasks(data: {
    tasks?: CoachingTask[];
    sessions?: CoachingSessionSlot[];
  }) {
    setTasks(data.tasks || []);
    if (data.sessions) setSessions(data.sessions);
  }

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: {
          "content-type": "application/json"},
        body: JSON.stringify({
          clientId,
          sessionNumber: assignSession ?? 1,
          title: title.trim(),
          instructions: instructions.trim(),
          recordingRequired})});
      const data = (await res.json()) as {
        error?: string;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not assign.");
      await refreshTasks(data);
      setTitle("");
      setInstructions("");
      setRecordingRequired(false);
      setAssignSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkReviewed(taskId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"},
        body: JSON.stringify({
          id: taskId,
          clientId,
          markReviewed: true})});
      const data = (await res.json()) as {
        error?: string;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not mark reviewed.");
      await refreshTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTaskEdit(e: FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"},
        body: JSON.stringify({
          id: editId,
          clientId,
          title: editTitle.trim(),
          instructions: editInstructions.trim(),
          recordingRequired: editRecordingRequired})});
      const data = (await res.json()) as {
        error?: string;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not edit.");
      await refreshTasks(data);
      setEditId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Remove this task? This also deletes any submission.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/tasks?id=${encodeURIComponent(id)}&clientId=${encodeURIComponent(clientId)}`,
        {
          method: "DELETE",
        },
      );
      const data = (await res.json()) as {
        error?: string;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not delete.");
      await refreshTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(task: CoachingTask) {
    setDownloadId(task.id);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/recordings?id=${encodeURIComponent(task.id)}`,
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Could not download.");
      }
      const blob = await res.blob();
      const header = res.headers.get("content-disposition") || "";
      const match = /filename="([^"]+)"/.exec(header);
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = match?.[1] || "recording.webm";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadId(null);
    }
  }

  function fillIntroForm(report: IntroCallReport | null) {
    if (report) {
      setIntro({
        clientId,
        summary: report.summary,
        challenges: report.challenges.length
          ? report.challenges
          : [{ title: "", body: "" }],
        coachingSchedule: report.coachingSchedule,
        osItems: report.osItems.length
          ? report.osItems
          : [{ name: "", goal: "", body: "" }],
        reps: report.reps.length ? report.reps : [{ title: "", body: "" }]});
    } else {
      setIntro(emptyIntroCall(clientId));
    }
  }

  function toggleSession(n: number) {
    setSelectedSession(n);
    setAssignSession(null);
    setEditId(null);
    setEditingIntro(false);
  }

  if (!client && busy) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-sm text-muted">
        Loading client…
      </main>
    );
  }

  if (!client) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="text-sm text-muted">Client not found.</p>
      </main>
    );
  }

  const row = client;
  const workCount = row.workSessionCount ?? WORK_SESSION_COUNT;
  const slots = programSlots(workCount).filter((n) => n !== 1);
  const here = parseCurrentStage(row.currentStage, workCount);

  async function onAddWorkSession() {
    if (!canEdit) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, action: "addWorkSession" }),
      });
      const data = (await res.json()) as {
        error?: string;
        sessions?: CoachingSessionSlot[];
        client?: CoachingClient;
      };
      if (!res.ok) throw new Error(data.error || "Could not add session.");
      if (data.sessions) setSessions(data.sessions);
      if (data.client) setClient(data.client);
      else await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add session.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveWorkSession(sessionNumber: number) {
    if (!canEdit) return;
    const label = sessionLabel(sessionNumber, workCount);
    if (
      !window.confirm(
        `Delete ${label}? Tasks and notes for this session will be removed. Later sessions shift down.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          action: "removeWorkSession",
          sessionNumber,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        sessions?: CoachingSessionSlot[];
        client?: CoachingClient;
      };
      if (!res.ok) throw new Error(data.error || "Could not remove session.");
      if (data.sessions) setSessions(data.sessions);
      if (data.client) setClient(data.client);
      else await load();
      if (selectedSession === sessionNumber) {
        setSelectedSession(INTRO_SESSION);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove session.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAdminNotes(sessionNumber: number) {
    if (!canEdit) return;
    setNotesBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          sessionNumber,
          adminNotes: notesDraft,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not save notes.");
      if (data.sessions) setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes.");
    } finally {
      setNotesBusy(false);
    }
  }

  function renderTask(task: CoachingTask, sessionLocked: boolean, open = true) {
    const lesson = !task.recordingRequired;
    const finished = isTaskFinished(task.status);
    const needsFeedback = task.recordingRequired || needsCoachReview(task);
    const kindLabel =
      lesson
        ? "Self lesson"
        : usesVideoLink(task)
          ? "Record video"
          : "Record audio";
    const progressLabel = lesson
      ? finished
        ? "Completed"
        : "Not completed"
      : task.status === "open"
        ? "Not started"
        : taskStatusLabel(task.status, "admin");
    return (
      <article key={task.id} className="rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() =>
                setExpandedTaskId((current) => (current === task.id ? null : task.id))
              }
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-900">{task.title}</h3>
              </span>
              <span className="pt-0.5 text-2xl leading-none text-slate-500">
                {open ? "−" : "+"}
              </span>
            </button>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{kindLabel}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                Audio required: {task.recordingRequired ? "Yes" : "No"}
              </span>
              <span
                className={
                  finished
                    ? "rounded-full bg-slate-900 px-2.5 py-0.5 font-bold text-white"
                    : "rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-800"
                }
              >
                {progressLabel}
              </span>
            </p>
          </div>
          {editId === task.id ? null : (
            <AdminReadOnly canEdit={canEdit} className="flex shrink-0 flex-wrap gap-2">
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditId(task.id);
                  setEditTitle(task.title);
                  setEditInstructions(task.instructions);
                  setEditRecordingRequired(task.recordingRequired);
                }}
                className={adminUi.btnGhost}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDelete(task.id)}
                className={adminUi.btnDanger}
              >
                Remove
              </button>
            </div>
            </AdminReadOnly>
          )}
        </div>
        {open && finished ? (
          <p className="mt-3 text-base font-semibold text-slate-700">
            This task has been completed.
          </p>
        ) : null}
        {open && editId === task.id ? (
          <AdminReadOnly canEdit={canEdit}>
          <form onSubmit={(e) => void onSaveTaskEdit(e)} className="mt-3 space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value.slice(0, 160))}
              className={`${adminUi.field} ${adminUi.focus}`}
              required
            />
            <textarea
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value.slice(0, 8000))}
              rows={4}
              className={`${adminUi.field} ${adminUi.focus}`}
              required
            />
            <TaskRequirementsField
              recordingRequired={editRecordingRequired}
              onRecordingRequired={setEditRecordingRequired}
              video={usesVideoLink(task)}
            />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={adminUi.btnSolid}>
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className={adminUi.btnGhost}
              >
                Cancel
              </button>
            </div>
          </form>
          </AdminReadOnly>
        ) : open ? (
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-800">
            {task.instructions}
          </p>
        ) : null}
        {open && task.responseText ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Client note
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{task.responseText}</p>
          </div>
        ) : null}
        {open && task.driveUrl ? (
          <div className="mt-4">
            <a
              href={task.driveUrl}
              target="_blank"
              rel="noreferrer"
              className={`text-sm font-semibold ${adminUi.link}`}
            >
              {videoShareKind(task.driveUrl) === "youtube"
                ? "Open YouTube video"
                : "Open Google Drive video"}
            </a>
          </div>
        ) : task.recordingUrl ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <audio controls src={task.recordingUrl} className="min-w-[16rem] flex-1" />
            <button
              type="button"
              disabled={downloadId === task.id}
              onClick={() => void onDownload(task)}
              className={adminUi.btnGhost}
            >
              {downloadId === task.id ? "Saving…" : "Download"}
            </button>
          </div>
        ) : open && task.recordingRequired && task.status !== "open" ? (
          <p className="mt-4 text-sm text-muted">
            {usesVideoLink(task)
              ? "No Drive or YouTube link yet."
              : "No recording yet."}
          </p>
        ) : null}
        {open &&
        needsFeedback &&
        !sessionLocked &&
        task.status === "submitted" ? (
          <AdminReadOnly canEdit={canEdit}>
            <div className="mt-4 rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-800">
                Audio in review
              </p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">
                Mark this submission reviewed
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onMarkReviewed(task.id)}
                className={`mt-4 min-h-12 px-6 text-base ${adminUi.btnSolid}`}
              >
                {busy ? "Saving…" : "Mark reviewed"}
              </button>
            </div>
          </AdminReadOnly>
        ) : null}
      </article>
    );
  }

  function renderWorkspace(sessionNumber: number) {
    const dataSessionNumber =
      sessionNumber === INTRO_SESSION ? 1 : sessionNumber;
    const sessionTasks =
      sessionNumber === INTRO_SESSION
        ? [
            ...tasksForSession(tasks, INTRO_SESSION),
            ...tasksForSession(tasks, 1),
          ]
        : tasksForSession(tasks, sessionNumber);
    const activeExpandedTaskId =
      expandedTaskId === null
        ? null
        : sessionTasks.some((task) => task.id === expandedTaskId)
          ? expandedTaskId
          : sessionTasks[0]?.id ?? null;
    const adding = assignSession === dataSessionNumber;
    const sessionLocked =
      sessionTasks.length > 0 &&
      sessionTasks.every((task) => isTaskFinished(task.status)) &&
      (sessionNumber !== INTRO_SESSION || !isIntroCallEmpty(introSaved));
    return (
      <article
        key={sessionNumber}
        className="space-y-4 rounded-2xl border border-border bg-white p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {sessionHeadline(sessionNumber, workCount)}
            </h2>
            {sessionLocked ? (
              <p className="mt-1.5 text-base font-semibold text-slate-700">
                This session has been completed.
              </p>
            ) : sessionMilestoneLine(sessionNumber, workCount) ? (
              <p className="mt-1.5 text-base text-muted">
                {sessionMilestoneLine(sessionNumber, workCount)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isMiddleWorkSession(sessionNumber, workCount) ? (
              <AdminReadOnly canEdit={canEdit}>
                <button
                  type="button"
                  disabled={busy || workCount <= 1}
                  onClick={() => void onRemoveWorkSession(sessionNumber)}
                  className={`${adminUi.btnGhost} ${adminUi.dangerBtn}`}
                >
                  Delete session
                </button>
              </AdminReadOnly>
            ) : null}
          <AdminReadOnly canEdit={canEdit}>
          <button
            type="button"
            onClick={() => {
              if (adding) {
                setAssignSession(null);
              } else {
                setAssignSession(dataSessionNumber);
                setTitle(`Task ${sessionTasks.length + 1}`);
                setInstructions("");
                setRecordingRequired(false);
              }
            }}
            className={adminUi.btnGhost}
          >
            {adding ? "Cancel" : "+ Task"}
          </button>
          </AdminReadOnly>
          </div>
        </div>

        {adding ? (
          <AdminReadOnly canEdit={canEdit}>
          <form onSubmit={(e) => void onAssign(e)} className="space-y-4 border-t border-border pt-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 160))}
              placeholder={`Task ${sessionTasks.length + 1}`}
              className={`${adminUi.field} ${adminUi.focus}`}
              required
            />
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value.slice(0, 8000))}
              placeholder="Instructions / exercises"
              rows={5}
              className={`${adminUi.field} ${adminUi.focus}`}
              required
            />
            <TaskRequirementsField
              recordingRequired={recordingRequired}
              onRecordingRequired={setRecordingRequired}
              video={false}
            />
            <button type="submit" disabled={busy} className={adminUi.primaryBtn}>
              {busy ? "Saving…" : "Add task"}
            </button>
          </form>
          </AdminReadOnly>
        ) : null}

        {sessionTasks.length === 0 && !adding ? (
          <p className="text-base text-muted">No tasks yet. Use + Task.</p>
        ) : (
          sessionTasks.map((task) =>
            renderTask(task, sessionLocked, task.id === activeExpandedTaskId),
          )
        )}

        <div className="border-t border-border pt-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
            Client notes
          </p>
          <p className="mt-1 text-sm text-muted">
            Private coaching notes — never shown to the client.
          </p>
          <AdminReadOnly canEdit={canEdit}>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value.slice(0, 20_000))}
              rows={4}
              placeholder="Notes about this client for this session…"
              className={`mt-3 ${adminUi.field} ${adminUi.focus}`}
            />
            <button
              type="button"
              disabled={notesBusy}
              onClick={() => void onSaveAdminNotes(dataSessionNumber)}
              className={`mt-3 ${adminUi.btnGhost}`}
            >
              {notesBusy ? "Saving…" : "Save notes"}
            </button>
          </AdminReadOnly>
        </div>

        {sessionNumber !== INTRO_SESSION ? (
          <TranscriptToWorkoutPanel
            clientId={clientId}
            targetSessionNumber={sessionNumber}
            workSessionCount={workCount}
            canEdit={canEdit}
            onSaved={refreshTasks}
          />
        ) : null}

        {sessionNumber === INTRO_SESSION ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wide">
                  Intro SpeechMap Report
                </h3>
                <p className="mt-1 text-base text-muted">
                  Joseph reviews the BEFORE recording live with the client, names
                  the top breakdowns, and sets focus areas.
                </p>
              </div>
              <AdminReadOnly canEdit={canEdit}>
              {editingIntro ? (
                <button
                  type="button"
                  onClick={() => {
                    fillIntroForm(introSaved);
                    setEditingIntro(false);
                  }}
                  className="text-sm font-semibold text-muted"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    fillIntroForm(introSaved);
                    setEditingIntro(true);
                  }}
                  className={`text-sm font-semibold ${adminUi.link}`}
                >
                  {isIntroCallEmpty(introSaved) ? "Write" : "Edit"}
                </button>
              )}
              </AdminReadOnly>
            </div>
            {editingIntro ? (
          <AdminReadOnly canEdit={canEdit}>
          <form
            onSubmit={(e) => void onSaveIntro(e)}
            className="space-y-4"
          >
            <label className="block text-base font-semibold">
              Our EliteSpeak Summary
              <textarea
                value={intro.summary}
                onChange={(e) =>
                  setIntro((prev) => ({ ...prev, summary: e.target.value }))
                }
                rows={8}
                className={`mt-1.5 ${adminUi.field} bg-white ${adminUi.focus}`}
              />
              <p className="mt-1 text-xs text-muted">
                Optional closing callout: add a line with only{" "}
                <code className="text-[11px]">---</code> then the callout text.
              </p>
            </label>
            <div>
              <p className="text-base font-semibold">Main Challenges</p>
              {intro.challenges.map((item, i) => (
                <div key={`c-${i}`} className="mt-2 space-y-2 border-t border-border pt-2">
                  <input
                    value={item.title}
                    onChange={(e) =>
                      setIntro((prev) => {
                        const challenges = [...prev.challenges];
                        challenges[i] = { ...item, title: e.target.value };
                        return { ...prev, challenges };
                      })
                    }
                    placeholder="Challenge title"
                    className={`${adminUi.field} bg-white ${adminUi.focus}`}
                  />
                  <textarea
                    value={item.body}
                    onChange={(e) =>
                      setIntro((prev) => {
                        const challenges = [...prev.challenges];
                        challenges[i] = { ...item, body: e.target.value };
                        return { ...prev, challenges };
                      })
                    }
                    placeholder="Challenge detail"
                    rows={3}
                    className={`${adminUi.field} bg-white ${adminUi.focus}`}
                  />
                  <p className="text-xs text-muted">
                    After{" "}
                    <code className="text-[11px]">---</code> on its own line =
                    italic emphasis line; use again for a boxed callout in
                    schedule / OS fields.
                  </p>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setIntro((prev) => ({
                    ...prev,
                    challenges: [...prev.challenges, { title: "", body: "" }]}))
                }
                className={`mt-2 text-sm font-semibold ${adminUi.link}`}
              >
                + Add challenge
              </button>
            </div>
            <label className="block text-base font-semibold">
              Coaching Schedule
              <textarea
                value={intro.coachingSchedule}
                onChange={(e) =>
                  setIntro((prev) => ({
                    ...prev,
                    coachingSchedule: e.target.value}))
                }
                rows={6}
                className={`mt-1.5 ${adminUi.field} bg-white ${adminUi.focus}`}
              />
            </label>
            <div>
              <p className="text-base font-semibold">Biggest Communication OS</p>
              {intro.osItems.map((item, i) => (
                <div key={`os-${i}`} className="mt-2 space-y-2 border-t border-border pt-2">
                  <input
                    value={item.name}
                    onChange={(e) =>
                      setIntro((prev) => {
                        const osItems = [...prev.osItems];
                        osItems[i] = { ...item, name: e.target.value };
                        return { ...prev, osItems };
                      })
                    }
                    placeholder="Current pattern (e.g. Uncompressed Thought)"
                    className={`${adminUi.field} bg-white ${adminUi.focus}`}
                  />
                  <input
                    value={item.goal}
                    onChange={(e) =>
                      setIntro((prev) => {
                        const osItems = [...prev.osItems];
                        osItems[i] = { ...item, goal: e.target.value };
                        return { ...prev, osItems };
                      })
                    }
                    placeholder="Goal (e.g. One sentence, then silence)"
                    className={`${adminUi.field} bg-white ${adminUi.focus}`}
                  />
                  <textarea
                    value={item.body}
                    onChange={(e) =>
                      setIntro((prev) => {
                        const osItems = [...prev.osItems];
                        osItems[i] = { ...item, body: e.target.value };
                        return { ...prev, osItems };
                      })
                    }
                    placeholder="Detail"
                    rows={3}
                    className={`${adminUi.field} bg-white ${adminUi.focus}`}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setIntro((prev) => ({
                    ...prev,
                    osItems: [...prev.osItems, { name: "", goal: "", body: "" }]}))
                }
                className={`mt-2 text-sm font-semibold ${adminUi.link}`}
              >
                + Add OS item
              </button>
            </div>
            <div>
              <p className="text-base font-semibold">What Reps Look Like</p>
              {intro.reps.map((item, i) => (
                <div key={`r-${i}`} className="mt-2 space-y-2 border-t border-border pt-2">
                  <input
                    value={item.title}
                    onChange={(e) =>
                      setIntro((prev) => {
                        const reps = [...prev.reps];
                        reps[i] = { ...item, title: e.target.value };
                        return { ...prev, reps };
                      })
                    }
                    placeholder="Rep title"
                    className={`${adminUi.field} bg-white ${adminUi.focus}`}
                  />
                  <textarea
                    value={item.body}
                    onChange={(e) =>
                      setIntro((prev) => {
                        const reps = [...prev.reps];
                        reps[i] = { ...item, body: e.target.value };
                        return { ...prev, reps };
                      })
                    }
                    placeholder="Rep detail"
                    rows={3}
                    className={`${adminUi.field} bg-white ${adminUi.focus}`}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setIntro((prev) => ({
                    ...prev,
                    reps: [...prev.reps, { title: "", body: "" }]}))
                }
                className={`mt-2 text-sm font-semibold ${adminUi.link}`}
              >
                + Add rep
              </button>
            </div>
            <button type="submit" disabled={introBusy} className={adminUi.primaryBtn}>
              {introBusy ? "Saving…" : "Save SpeechMap report"}
            </button>
          </form>
          </AdminReadOnly>
            ) : (
              <div className="es-admin-intro-preview">
                <IntroCallView clientName={row.name} report={introSaved} />
              </div>
            )}
          </div>
        ) : null}

        {sessionNumber === INTRO_SESSION ? (
          <TranscriptToWorkoutPanel
            clientId={clientId}
            targetSessionNumber={dataSessionNumber}
            workSessionCount={workCount}
            canEdit={canEdit}
            onSaved={refreshTasks}
          />
        ) : null}
      </article>
    );
  }

  return (
    <div className="app-shell flex min-h-dvh w-full flex-col">
      <header className="shrink-0 border-b border-border px-6 py-5 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href="/admin/clients" className={`text-base font-semibold ${adminUi.link}`}>
              ← Clients
            </Link>
            <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.16em] ${adminUi.brand}`}>
              EliteSpeak
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{client.name}</h1>
            <p className="mt-1 text-base text-muted">{client.email}</p>
            {client.currentFocus ? (
              <p className="mt-2 text-base">{client.currentFocus}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-3 text-base">
            <p className="font-semibold">
              Now:{" "}
              {sessionLabel(
                groupedProgramSession(
                  parseCurrentStage(client.currentStage, workCount),
                ),
                workCount,
              )}
            </p>
            {client.reviewRequired ? (
              <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-amber-800">
                Audio in review
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setLinkedinOpen(true)}
              className={
                client.onboardingComplete ? adminUi.btnSolid : adminUi.btnGhost
              }
            >
              {client.onboardingComplete ? "Profiles" : "Profiles pending"}
            </button>
          </div>
        </div>
        {error ? <p className={`mt-4 text-base ${adminUi.dangerText}`}>{error}</p> : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-0 h-[calc(100dvh-9rem)] w-80 shrink-0 overflow-y-auto border-r border-border bg-white">
          <div className="px-4 py-3">
            <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
              Program
            </p>
            <p className="mt-1 text-sm text-muted">
              Assign ahead if you want. The client only sees a session after the previous one is complete.
            </p>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 pb-6">
            {slots.map((n) => {
              const sessionTasks =
                n === INTRO_SESSION
                  ? [
                      ...tasksForSession(tasks, INTRO_SESSION),
                      ...tasksForSession(tasks, 1),
                    ]
                  : tasksForSession(tasks, n);
              const tone = sessionTone(
                n,
                client.currentStage,
                sessionTasks,
                introSaved,
                workCount,
              );
              const open = selectedSession === n;
              const countLabel =
                n === INTRO_SESSION
                  ? sessionTasks.length
                    ? `${sessionTasks.length} item${sessionTasks.length === 1 ? "" : "s"}`
                    : "Baseline"
                  : isFinalSession(n, workCount)
                    ? sessionTasks.length
                      ? `${sessionTasks.length} item${sessionTasks.length === 1 ? "" : "s"}`
                      : "Completion"
                    : sessionTasks.length
                      ? `${sessionTasks.length} task${sessionTasks.length === 1 ? "" : "s"}`
                      : "No tasks yet";
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleSession(n)}
                  className={navRowClass(open, tone)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold">
                      {sessionLabel(n, workCount)}
                    </span>
                    {groupedProgramSession(here) === n ? (
                      <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-white">
                        Now
                      </span>
                    ) : tone === "complete" ? (
                      <span className="text-sm font-bold text-slate-500">✓</span>
                    ) : null}
                  </span>
                  <span
                    className={
                      tone === "review"
                        ? "mt-0.5 block text-sm font-extrabold uppercase tracking-wide text-amber-800"
                        : "mt-0.5 block text-sm text-muted"
                    }
                  >
                    {tone === "review"
                      ? "Audio in review"
                      : tone === "complete"
                        ? "Complete"
                        : countLabel}
                  </span>
                </button>
              );
            })}
            <AdminReadOnly canEdit={canEdit}>
              <button
                type="button"
                disabled={busy || workCount >= MAX_WORK_SESSION_COUNT}
                onClick={() => void onAddWorkSession()}
                className={`mt-3 w-full ${adminUi.btnGhost}`}
              >
                + Session
              </button>
            </AdminReadOnly>
          </nav>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-10">
          <ViewerReadOnlyBanner canEdit={canEdit} />
          {renderWorkspace(selectedSession)}
        </section>
      </div>
      <AdminLinkedInDrawer
        client={client}
        open={linkedinOpen}
        onClose={() => setLinkedinOpen(false)}
      />
    </div>
  );
}
