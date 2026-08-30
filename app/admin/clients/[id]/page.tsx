"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IntroCallView } from "@/components/IntroCallView";
import type { CoachingClient } from "@/lib/coaching-clients";
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
  needsCoachReview,
  taskStatusLabel,
  type CoachingTask,
} from "@/lib/coaching-tasks";
import {
  emptyIntroCall,
  isIntroCallEmpty,
  type IntroCallReport,
} from "@/lib/intro-call";

function navRowClass(
  open: boolean,
  kind: "current" | "review" | "complete" | "idle",
): string {
  const base =
    "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-left border-l-4";
  if (open) {
    return `${base} border-l-teal-700 bg-slate-50`;
  }
  if (kind === "review") return `${base} border-l-amber-500 hover:bg-slate-50`;
  if (kind === "current") return `${base} border-l-teal-600 hover:bg-slate-50`;
  return `${base} border-l-transparent hover:bg-slate-50`;
}

const ADMIN_SESSION_KEY = "ca_admin_password";

const adminUi = {
  brand: "text-teal-700",
  link: "text-teal-700 hover:text-teal-900",
  focus: "focus:border-teal-500 focus:ring-teal-500/20",
  primaryBtn:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 font-bold text-white disabled:opacity-55",
  btnGhost:
    "inline-flex min-h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-55",
  btnSolid:
    "inline-flex min-h-9 items-center justify-center rounded-full bg-slate-900 px-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-55",
  btnDanger:
    "inline-flex min-h-9 items-center justify-center rounded-full border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-55",
  dangerText: "text-rose-600",
  dangerBtn: "text-rose-700 hover:text-rose-800",
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
  const [recordingRequired, setRecordingRequired] = useState(true);
  const [reviewRequired, setReviewRequired] = useState(true);

  const [rateId, setRateId] = useState<string | null>(null);
  const [rating, setRating] = useState("8");
  const [comment, setComment] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

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
          recordingRequired,
          reviewRequired,
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

  function renderTask(task: CoachingTask) {
    return (
      <article key={task.id} className="rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-slate-900">{task.title}</h3>
            <p className="mt-1 text-xs text-muted">
              {[
                task.status === "open"
                  ? null
                  : taskStatusLabel(task.status, "admin"),
                task.recordingRequired ? "video" : null,
                needsCoachReview(task) ? "review" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {needsCoachReview(task) ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditId(task.id);
                  setEditTitle(task.title);
                  setEditInstructions(task.instructions);
                }}
                className={adminUi.btnGhost}
              >
                Edit
              </button>
              {task.status === "open" && !task.recordingRequired ? (
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
          ) : null}
        </div>
        {editId === task.id ? (
          <form onSubmit={(e) => void onSaveTaskEdit(e)} className="space-y-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value.slice(0, 160))}
              className={`w-full rounded-xl border border-border px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              required
            />
            <textarea
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value.slice(0, 8000))}
              rows={5}
              className={`w-full rounded-xl border border-border px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              required
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
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
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
              Open Google Drive video
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
          <p className="mt-4 text-sm text-muted">No Google Drive link yet.</p>
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
        (task.status === "submitted" ||
          task.status === "reviewed" ||
          task.status === "done") ? (
          rateId === task.id ? (
            <form onSubmit={(e) => void onRate(e)} className="mt-4 space-y-3 rounded-xl border border-border p-4">
              <p className="text-sm font-extrabold">Coach rating</p>
              <label className="block text-sm font-semibold">
                Score 0–10
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className={`mt-1 w-24 rounded-lg border border-border px-2 py-1.5 text-sm ${adminUi.focus}`}
                  required
                />
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                placeholder="Comment for the client"
                rows={3}
                className={`w-full rounded-xl border border-border px-3 py-2 text-sm ${adminUi.focus}`}
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
    return (
      <article
        key={sessionNumber}
        className="space-y-5 rounded-2xl border border-border bg-white p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              {sessionHeadline(sessionNumber)}
            </h2>
            {sessionMilestoneLine(sessionNumber) ? (
              <p className="mt-1 text-sm text-muted">
                {sessionMilestoneLine(sessionNumber)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              if (adding) {
                setAssignSession(null);
              } else {
                setAssignSession(sessionNumber);
                setTitle(`Task ${sessionTasks.length + 1}`);
              }
            }}
            className={adminUi.btnGhost}
          >
            {adding ? "Cancel" : "+ Task"}
          </button>
        </div>

        {adding ? (
          <form onSubmit={(e) => void onAssign(e)} className="space-y-3 border-t border-border pt-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 160))}
              placeholder={`Task ${sessionTasks.length + 1}`}
              className={`w-full rounded-xl border border-border px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              required
            />
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value.slice(0, 8000))}
              placeholder="Instructions / exercises"
              rows={5}
              className={`w-full rounded-xl border border-border px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              required
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={recordingRequired}
                onChange={(e) => setRecordingRequired(e.target.checked)}
                className="accent-teal-600"
              />
              Video — client pastes a Google Drive link
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={reviewRequired}
                onChange={(e) => setReviewRequired(e.target.checked)}
                className="accent-teal-600"
              />
              Coach review required
            </label>
            <button type="submit" disabled={busy} className={adminUi.primaryBtn}>
              {busy ? "Saving…" : "Add task"}
            </button>
          </form>
        ) : null}

        {sessionTasks.length === 0 && !adding ? (
          <p className="text-sm text-muted">No tasks yet. Use + Task.</p>
        ) : (
          sessionTasks.map((task) => renderTask(task))
        )}

        {sessionNumber === INTRO_SESSION ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wide">
                  Intro Diagnosis
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Joseph reviews the BEFORE recording live with the client, names
                  the top breakdowns, and sets focus areas.
                </p>
              </div>
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
            </div>
            {editingIntro ? (
          <form
            onSubmit={(e) => void onSaveIntro(e)}
            className="space-y-4"
          >
            <label className="block text-sm font-semibold">
              Our EliteSpeak Summary
              <textarea
                value={intro.summary}
                onChange={(e) =>
                  setIntro((prev) => ({ ...prev, summary: e.target.value }))
                }
                rows={8}
                className={`mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              />
            </label>
            <div>
              <p className="text-sm font-semibold">Main Challenges</p>
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
                    className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
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
                    className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
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
            <label className="block text-sm font-semibold">
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
                className={`mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
              />
            </label>
            <div>
              <p className="text-sm font-semibold">Biggest Communication OS</p>
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
                    className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
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
                    className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
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
                    className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
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
              <p className="text-sm font-semibold">What Reps Look Like</p>
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
                    className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
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
                    className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ${adminUi.focus}`}
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
            <Link href="/admin/clients" className={`text-sm font-semibold ${adminUi.link}`}>
              ← Clients
            </Link>
            <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.16em] ${adminUi.brand}`}>
              EliteSpeak
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{client.name}</h1>
            <p className="mt-1 text-sm text-muted">{client.email}</p>
            {client.currentFocus ? (
              <p className="mt-2 text-sm">{client.currentFocus}</p>
            ) : null}
          </div>
          <div className="text-sm">
            <p className="font-semibold">
              Now: {client.currentStage || "Intro Call"}
              {client.reviewRequired ? " · Review required" : ""}
            </p>
            {client.meetingLink ? (
              <a
                href={client.meetingLink}
                target="_blank"
                rel="noreferrer"
                className={`mt-2 inline-block font-semibold ${adminUi.link}`}
              >
                Meeting link
              </a>
            ) : (
              <p className="mt-2 text-muted">No meeting link</p>
            )}
          </div>
        </div>
        {error ? <p className={`mt-4 text-sm ${adminUi.dangerText}`}>{error}</p> : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-0 h-[calc(100dvh-9rem)] w-72 shrink-0 overflow-y-auto border-r border-border bg-white">
          <div className="px-4 py-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
              Program
            </p>
            <p className="mt-1 text-xs text-muted">
              One session at a time. Select from this list.
            </p>
          </div>
          <nav className="flex flex-col gap-1 px-3 pb-6">
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
                  <span className="block text-sm font-bold">
                    {sessionLabel(n)}
                    {here === n ? (
                      <span className="ml-2 text-xs font-semibold text-muted">
                        Now
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
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
