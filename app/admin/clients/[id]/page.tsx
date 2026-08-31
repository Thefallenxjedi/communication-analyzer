"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IntroCallView } from "@/components/IntroCallView";
import type { CoachingClient } from "@/lib/coaching-clients";
import {
  parseLinkedInProfile,
} from "@/lib/linkedin-profile";
import {
  FINAL_SESSION,
  INTRO_SESSION,
  PROGRAM_SLOTS,
  parseCurrentStage,
  sessionHeadline,
  sessionLabel,
  sessionMilestoneLine,
} from "@/lib/coaching-program";
import type { CoachingSessionSlot } from "@/lib/coaching-sessions";
import {
  isTaskLocked,
  isTaskFinished,
  needsCoachReview,
  taskResponseKind,
  taskStatusLabel,
  usesVideoLink,
  type CoachingTask,
  type TaskResponseKind,
} from "@/lib/coaching-tasks";
import { videoShareKind } from "@/lib/google-drive";
import {
  emptyIntroCall,
  isIntroCallEmpty,
  type IntroCallReport,
} from "@/lib/intro-call";

function AdminLinkedInCard({ client }: { client: CoachingClient }) {
  if (!client.onboardingComplete) {
    return (
      <p className="mt-4 text-base font-semibold text-amber-800">
        Client has not finished first-login onboarding yet.
      </p>
    );
  }
  const profile = parseLinkedInProfile(client.linkedinProfileJson);
  return (
    <section className="mt-5 max-w-3xl rounded-2xl border border-border bg-white p-5">
      <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
        Client profile
      </p>
      <p className="mt-2 text-lg font-extrabold">
        {profile?.fullName || client.name}
        {profile?.headline ? (
          <span className="ml-2 text-base font-semibold text-muted">
            {profile.headline}
          </span>
        ) : null}
      </p>
      {client.onboardingRole ? (
        <p className="mt-1 text-base">
          {client.onboardingRole}
          {client.onboardingCompany ? ` · ${client.onboardingCompany}` : ""}
        </p>
      ) : null}
      {client.onboardingGoal ? (
        <p className="mt-2 text-base text-slate-700">{client.onboardingGoal}</p>
      ) : null}
      {profile?.about ? (
        <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-800">
          {profile.about}
        </p>
      ) : null}
      {profile && profile.experience.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {profile.experience.slice(0, 4).map((job, i) => (
            <li key={`${job.company}-${i}`} className="text-base">
              <span className="font-bold">{job.title}</span>
              {job.company ? ` · ${job.company}` : ""}
              {job.dates ? (
                <span className="text-muted"> · {job.dates}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ResponseTypeField({
  kind,
  onChange,
  video,
}: {
  kind: TaskResponseKind;
  onChange: (kind: TaskResponseKind) => void;
  video: boolean;
}) {
  const recordHint = video
    ? "Client pastes a Drive or YouTube link."
    : "Client records audio in the app.";
  const selected =
    "rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3.5 text-left";
  const idle =
    "rounded-xl border border-border bg-white px-4 py-3.5 text-left hover:bg-slate-50";
  return (
    <fieldset>
      <legend className="text-base font-semibold">Task type</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("record")}
          className={kind === "record" ? selected : idle}
        >
          <span className="block text-base font-extrabold">Record audio</span>
          <span className="mt-1 block text-sm font-normal text-muted">
            {recordHint}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange("lesson")}
          className={kind === "lesson" ? selected : idle}
        >
          <span className="block text-base font-extrabold">Self lesson</span>
          <span className="mt-1 block text-sm font-normal text-muted">
            Written work. Client marks complete. No recording.
          </span>
        </button>
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
    "w-full rounded-xl border border-border px-3.5 py-3 text-base outline-none",
} as const;

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
): "current" | "review" | "complete" | "idle" {
  const here = parseCurrentStage(currentStage) === sessionNumber;
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

  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<CoachingClient | null>(null);
  const [tasks, setTasks] = useState<CoachingTask[]>([]);
  const [assignSession, setAssignSession] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState(INTRO_SESSION);
  const [intro, setIntro] = useState(emptyIntroCall());
  const [introSaved, setIntroSaved] = useState<IntroCallReport | null>(null);
  const [introBusy, setIntroBusy] = useState(false);
  const [editingIntro, setEditingIntro] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [responseKind, setResponseKind] = useState<TaskResponseKind>("record");

  const [rateId, setRateId] = useState<string | null>(null);
  const [rating, setRating] = useState("8");
  const [comment, setComment] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editKind, setEditKind] = useState<TaskResponseKind>("record");

  const load = useCallback(
    async (pwd: string) => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`, {
          headers: { "x-admin-password": pwd },
        });
        const data = (await res.json()) as {
          error?: string;
          client?: CoachingClient;
          tasks?: CoachingTask[];
          sessions?: CoachingSessionSlot[];
        };
        if (!res.ok) throw new Error(data.error || "Could not load client.");
        setClient(data.client ?? null);
        setTasks(data.tasks || []);
        if (!unlocked) {
          setSelectedSession(parseCurrentStage(data.client?.currentStage));
        }

        const introRes = await fetch(
          `/api/admin/intro-call?clientId=${encodeURIComponent(clientId)}`,
          { headers: { "x-admin-password": pwd } },
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
              : [{ title: "", body: "" }],
          });
        } else {
          setIntroSaved(null);
          setIntro(emptyIntroCall(clientId));
        }
        setPassword(pwd);
        setUnlocked(true);
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, pwd);
        } catch {
          // ignore
        }
      } catch (err) {
        setUnlocked(false);
        setError(err instanceof Error ? err.message : "Unauthorized.");
      } finally {
        setBusy(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(ADMIN_SESSION_KEY)?.trim();
        if (saved) void load(saved);
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function onSaveIntro(e: FormEvent) {
    e.preventDefault();
    setIntroBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intro-call", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          clientId,
          summary: intro.summary,
          challenges: intro.challenges,
          coachingSchedule: intro.coachingSchedule,
          osItems: intro.osItems,
          reps: intro.reps,
        }),
      });
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
  }

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          clientId,
          sessionNumber: assignSession ?? 1,
          title: title.trim(),
          instructions: instructions.trim(),
          recordingRequired: responseKind === "record",
          reviewRequired: responseKind === "record",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not assign.");
      await refreshTasks(data);
      setTitle("");
      setInstructions("");
      setAssignSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRate(e: FormEvent) {
    e.preventDefault();
    if (!rateId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          id: rateId,
          clientId,
          rating: Number(rating),
          comment: comment.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not rate.");
      await refreshTasks(data);
      setRateId(null);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rate failed.");
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
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          id: editId,
          clientId,
          title: editTitle.trim(),
          instructions: editInstructions.trim(),
          recordingRequired: editKind === "record",
          reviewRequired: editKind === "record",
        }),
      });
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

  async function onComplete(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id, clientId, complete: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        tasks?: CoachingTask[];
        sessions?: CoachingSessionSlot[];
      };
      if (!res.ok) throw new Error(data.error || "Could not complete.");
      await refreshTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Complete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Remove this open task?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/tasks?id=${encodeURIComponent(id)}&clientId=${encodeURIComponent(clientId)}`,
        { method: "DELETE", headers: { "x-admin-password": password } },
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
        { headers: { "x-admin-password": password } },
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
        reps: report.reps.length ? report.reps : [{ title: "", body: "" }],
      });
    } else {
      setIntro(emptyIntroCall(clientId));
    }
  }

  function toggleSession(n: number) {
    setSelectedSession(n);
    setAssignSession(null);
    setEditId(null);
    setRateId(null);
    setEditingIntro(false);
  }

  if (!unlocked) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <Link href="/admin/clients" className={`text-sm font-semibold ${adminUi.link}`}>
          ← Clients
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold">Client</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(password.trim());
          }}
          className="mt-6 space-y-4"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none ${adminUi.focus}`}
            placeholder="Admin password"
            required
          />
          {error ? <p className={`text-sm ${adminUi.dangerText}`}>{error}</p> : null}
          <button type="submit" disabled={busy} className={adminUi.primaryBtn}>
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
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
  const here = parseCurrentStage(row.currentStage);

  function renderTask(task: CoachingTask, sessionLocked: boolean) {
    const lesson = taskResponseKind(task) === "lesson";
    const finished = isTaskFinished(task.status);
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
            <h3 className="text-lg font-extrabold text-slate-900">{task.title}</h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{kindLabel}</span>
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
          {sessionLocked || finished || editId === task.id ? null : (
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditId(task.id);
                  setEditTitle(task.title);
                  setEditInstructions(task.instructions);
                  setEditKind(taskResponseKind(task));
                }}
                className={adminUi.btnGhost}
              >
                Edit
              </button>
              {needsCoachReview(task) &&
              task.status === "open" &&
              !task.recordingRequired ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onComplete(task.id)}
                  className={adminUi.btnSolid}
                >
                  Mark complete
                </button>
              ) : null}
              {!isTaskLocked(task.status) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete(task.id)}
                  className={adminUi.btnDanger}
                >
                  Remove
                </button>
              ) : null}
            </div>
          )}
        </div>
        {finished ? (
          <p className="mt-3 text-base font-semibold text-slate-700">
            This task has been completed.
          </p>
        ) : null}
        {editId === task.id && !finished && !sessionLocked ? (
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
            <ResponseTypeField
              kind={editKind}
              onChange={setEditKind}
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
        ) : (
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-800">
            {task.instructions}
          </p>
        )}
        {task.responseText ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Client note
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{task.responseText}</p>
          </div>
        ) : null}
        {task.driveUrl ? (
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
        ) : task.recordingRequired && task.status !== "open" ? (
          <p className="mt-4 text-sm text-muted">
            {usesVideoLink(task)
              ? "No Drive or YouTube link yet."
              : "No recording yet."}
          </p>
        ) : null}
        {task.rating != null && rateId !== task.id ? (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border px-4 py-3">
            <p className="text-3xl font-extrabold tabular-nums text-slate-900">
              {task.rating}
              <span className="text-base font-semibold text-muted"> / 10</span>
            </p>
            <p className="min-w-0 flex-1 text-sm">
              {task.ratingComment || "No written comment."}
            </p>
          </div>
        ) : null}
        {needsCoachReview(task) &&
        !sessionLocked &&
        (task.status === "submitted" ||
          task.status === "reviewed" ||
          task.status === "done") ? (
          rateId === task.id ? (
            <form onSubmit={(e) => void onRate(e)} className="mt-4 space-y-3 rounded-xl border border-border p-4">
              <p className="text-base font-extrabold">Coach rating</p>
              <label className="block text-base font-semibold">
                Score 0–10
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className={`mt-1 w-28 rounded-lg border border-border px-2.5 py-2 text-base ${adminUi.focus}`}
                  required
                />
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                placeholder="Comment for the client"
                rows={3}
                className={`${adminUi.field} ${adminUi.focus}`}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={adminUi.btnSolid}>
                  Save rating
                </button>
                <button
                  type="button"
                  onClick={() => setRateId(null)}
                  className={adminUi.btnGhost}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : task.status === "submitted" && task.rating == null ? (
            <div className="mt-4 rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-800">
                Review required
              </p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">
                Score this submission
              </p>
              <button
                type="button"
                onClick={() => {
                  setRateId(task.id);
                  setRating(task.rating != null ? String(task.rating) : "8");
                  setComment(task.ratingComment);
                }}
                className={`mt-4 min-h-12 px-6 text-base ${adminUi.btnSolid}`}
              >
                Add rating
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRateId(task.id);
                setRating(task.rating != null ? String(task.rating) : "8");
                setComment(task.ratingComment);
              }}
              className={`mt-4 ${adminUi.btnGhost}`}
            >
              {task.rating != null ? "Edit rating" : "Add rating"}
            </button>
          )
        ) : null}
      </article>
    );
  }

  function renderWorkspace(sessionNumber: number) {
    const sessionTasks = tasksForSession(tasks, sessionNumber);
    const adding = assignSession === sessionNumber;
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
              {sessionHeadline(sessionNumber)}
            </h2>
            {sessionLocked ? (
              <p className="mt-1.5 text-base font-semibold text-slate-700">
                This session has been completed.
              </p>
            ) : sessionMilestoneLine(sessionNumber) ? (
              <p className="mt-1.5 text-base text-muted">
                {sessionMilestoneLine(sessionNumber)}
              </p>
            ) : null}
          </div>
          {sessionLocked ? null : (
          <button
            type="button"
            onClick={() => {
              if (adding) {
                setAssignSession(null);
              } else {
                setAssignSession(sessionNumber);
                setTitle(`Task ${sessionTasks.length + 1}`);
                setInstructions("");
                setResponseKind("record");
              }
            }}
            className={adminUi.btnGhost}
          >
            {adding ? "Cancel" : "+ Task"}
          </button>
          )}
        </div>

        {adding && !sessionLocked ? (
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
            <ResponseTypeField
              kind={responseKind}
              onChange={setResponseKind}
              video={sessionNumber === INTRO_SESSION}
            />
            <button type="submit" disabled={busy} className={adminUi.primaryBtn}>
              {busy ? "Saving…" : "Add task"}
            </button>
          </form>
        ) : null}

        {sessionTasks.length === 0 && !adding ? (
          <p className="text-base text-muted">No tasks yet. Use + Task.</p>
        ) : (
          sessionTasks.map((task) => renderTask(task, sessionLocked))
        )}

        {sessionNumber === INTRO_SESSION ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wide">
                  Intro Diagnosis
                </h3>
                <p className="mt-1 text-base text-muted">
                  Joseph reviews the BEFORE recording live with the client, names
                  the top breakdowns, and sets focus areas.
                </p>
              </div>
              {sessionLocked ? null : editingIntro ? (
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
            </div>
            {editingIntro ? (
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
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setIntro((prev) => ({
                    ...prev,
                    challenges: [...prev.challenges, { title: "", body: "" }],
                  }))
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
                    coachingSchedule: e.target.value,
                  }))
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
                    osItems: [...prev.osItems, { name: "", goal: "", body: "" }],
                  }))
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
                    reps: [...prev.reps, { title: "", body: "" }],
                  }))
                }
                className={`mt-2 text-sm font-semibold ${adminUi.link}`}
              >
                + Add rep
              </button>
            </div>
            <button type="submit" disabled={introBusy} className={adminUi.primaryBtn}>
              {introBusy ? "Saving…" : "Save intro diagnosis"}
            </button>
          </form>
            ) : (
              <IntroCallView clientName={row.name} report={introSaved} />
            )}
          </div>
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
          <div className="text-base">
            <p className="font-semibold">
              Now: {client.currentStage || "Intro Call"}
            </p>
            {client.reviewRequired ? (
              <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-amber-800">
                Review required
              </p>
            ) : null}
          </div>
        </div>
        <AdminLinkedInCard client={client} />
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
            {PROGRAM_SLOTS.map((n) => {
              const sessionTasks = tasksForSession(tasks, n);
              const tone = sessionTone(n, client.currentStage, sessionTasks, introSaved);
              const open = selectedSession === n;
              const countLabel =
                n === INTRO_SESSION
                  ? sessionTasks.length
                    ? `${sessionTasks.length} item${sessionTasks.length === 1 ? "" : "s"}`
                    : "Baseline"
                  : n === FINAL_SESSION
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
                    <span className="text-base font-bold">{sessionLabel(n)}</span>
                    {here === n ? (
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
                      ? "Review required"
                      : tone === "complete"
                        ? "Complete"
                        : countLabel}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-10">
          {renderWorkspace(selectedSession)}
        </section>
      </div>
    </div>
  );
}
