"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipPlayer } from "@/components/ClipPlayer";
import { TaskRecorder } from "@/components/TaskRecorder";
import type { ClientDiagnosis } from "@/lib/client-diagnoses";

const GENERATING_LINES = [
  "Listening for how clearly the point landed.",
  "Finding the pattern that showed up most.",
  "Checking pace, structure, and filler habits.",
  "Writing a report you can use this week.",
  "Almost ready. Stay here.",
] as const;

function formatStamp(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function topStats(row: ClientDiagnosis, dir: "best" | "worst") {
  const stats = row.report?.stats ?? [];
  const sorted = [...stats].sort((a, b) =>
    dir === "best" ? b.score - a.score : a.score - b.score,
  );
  return sorted.slice(0, 3);
}

function GeneratingReport() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % GENERATING_LINES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="es-dx-generating" aria-live="polite">
      <span className="es-dx-generating-ember" aria-hidden />
      <p className="es-dx-kicker">Generating report</p>
      <h3 className="es-dx-generating-title">Your report is being written</h3>
      <p className="es-dx-generating-copy">{GENERATING_LINES[index]}</p>
      <p className="es-dx-generating-note">
        This usually takes under a minute. The latest report will open here when
        it is ready.
      </p>
    </section>
  );
}

export function ClientDiagnosisPanel({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const [diagnoses, setDiagnoses] = useState<ClientDiagnosis[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<"new" | "history">("new");
  const [loading, setLoading] = useState(!readOnly);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showEarlier, setShowEarlier] = useState(false);
  const reportRef = useRef<HTMLElement | null>(null);

  async function fetchDiagnoses() {
    const res = await fetch("/api/client/diagnoses");
    const data = (await res.json()) as {
      error?: string;
      diagnoses?: ClientDiagnosis[];
    };
    if (!res.ok) throw new Error(data.error || "Could not load reports.");
    return data.diagnoses || [];
  }

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchDiagnoses();
        if (cancelled) return;
        setDiagnoses(rows);
        setSelectedId((current) =>
          current && rows.some((row) => row.id === current) ? current : rows[0]?.id || "",
        );
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load reports.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const selected = useMemo(
    () => diagnoses.find((row) => row.id === selectedId) ?? diagnoses[0] ?? null,
    [diagnoses, selectedId],
  );
  const latest = diagnoses[0] ?? null;
  const isLatest = Boolean(selected && latest && selected.id === latest.id);

  async function runDiagnosis(file: File, durationSec: number) {
    if (readOnly || busy) return;
    setBusy(true);
    setError("");
    setView("new");
    try {
      const urlRes = await fetch("/api/client/workouts/upload", { method: "POST" });
      const urlData = (await urlRes.json()) as { uploadUrl?: string; error?: string };
      if (!urlRes.ok || !urlData.uploadUrl) {
        throw new Error(urlData.error || "Could not start upload.");
      }
      const uploaded = await fetch(urlData.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "audio/webm" },
        body: file,
      });
      if (!uploaded.ok) throw new Error("Upload failed.");
      const stored = (await uploaded.json()) as { storageId?: string };
      if (!stored.storageId) throw new Error("Upload did not return a file id.");

      const res = await fetch("/api/client/diagnoses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storageId: stored.storageId,
          durationSec,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not finish this recording.");
      const rows = await fetchDiagnoses();
      setDiagnoses(rows);
      setSelectedId(rows[0]?.id || "");
      setShowEarlier(false);
      setView("history");
      window.setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish this recording.");
    } finally {
      setBusy(false);
    }
  }

  if (readOnly) {
    return (
      <div className="es-dx-empty">
        <p className="es-dx-empty-title">Your SpeechMap reports live here.</p>
        <p className="es-dx-empty-copy">
          In your real client account, each speaking check will save here with the
          score, focus area, and recording.
        </p>
      </div>
    );
  }

  return (
    <div className="es-dx">
      <div className="es-dx-switch" role="tablist" aria-label="SpeechMap report views">
        <button
          type="button"
          role="tab"
          aria-selected={view === "new"}
          className={view === "new" ? "es-dx-switch-btn es-dx-switch-btn--active" : "es-dx-switch-btn"}
          onClick={() => setView("new")}
        >
          Record your voice
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "history"}
          className={view === "history" ? "es-dx-switch-btn es-dx-switch-btn--active" : "es-dx-switch-btn"}
          onClick={() => setView("history")}
        >
          Previous reports
        </button>
      </div>

      {busy ? <GeneratingReport /> : null}

      {!busy && view === "new" ? (
        <section className="es-dx-run">
          <div className="es-dx-run-head">
            <div>
              <p className="es-dx-kicker">Record your voice</p>
              <p className="es-dx-run-copy">
                Speak for 30 to 90 seconds about anything. When you stop, your
                latest report opens here.
              </p>
            </div>
          </div>
          <div className="es-dx-recorder">
            <TaskRecorder
              look="client"
              disabled={busy}
              onReady={(file, durationSec) => {
                setError("");
                void runDiagnosis(file, durationSec);
              }}
            />
          </div>
        </section>
      ) : null}

      {error ? <p className="es-client-error">{error}</p> : null}

      {busy ? null : loading ? (
        <p className="es-dx-loading">Loading reports…</p>
      ) : diagnoses.length === 0 ? (
        view === "history" ? (
          <div className="es-dx-empty">
            <p className="es-dx-empty-title">No previous reports yet.</p>
            <p className="es-dx-empty-copy">
              Record your voice once and your report will appear here.
            </p>
          </div>
        ) : null
      ) : view === "history" && selected ? (
        <div className="es-dx-grid">
          <section ref={reportRef} className="es-dx-detail">
            <div className="es-dx-detail-head">
              <div>
                <p className="es-dx-kicker">
                  {isLatest ? "Latest report" : "Earlier report"}
                </p>
                <h3 className="es-dx-detail-title">
                  {selected.mainFocus || "Report"}
                </h3>
                <p className="es-dx-detail-date">{formatStamp(selected.createdAt)}</p>
              </div>
              <div className="es-dx-detail-score">
                <span>{selected.overallScore ?? "—"}</span>
                <small>/100</small>
              </div>
            </div>

            {selected.recordingUrl ? (
              <div className="es-dx-player">
                <ClipPlayer src={selected.recordingUrl} durationSec={selected.durationSec ?? undefined} />
              </div>
            ) : null}

            {selected.sharePath ? (
              <a href={selected.sharePath} target="_blank" rel="noreferrer" className="es-share-card">
                <span className="es-share-card-copy">
                  <span className="es-share-card-kind">Saved report</span>
                  <span className="es-share-card-action">Open full report →</span>
                </span>
              </a>
            ) : null}

            {selected.status === "failed" ? (
              <div className="es-dx-note">
                <p className="es-dx-note-title">This attempt did not finish.</p>
                <p className="es-dx-note-copy">
                  {selected.failureReason || "Please try again with a clearer answer."}
                </p>
              </div>
            ) : (
              <>
                <div className="es-dx-columns">
                  <div className="es-dx-card">
                    <p className="es-dx-card-label">Level</p>
                    <p className="es-dx-card-body">{selected.level || "—"}</p>
                  </div>
                  <div className="es-dx-card">
                    <p className="es-dx-card-label">Comes across as</p>
                    <p className="es-dx-card-body">
                      {selected.report?.comesAcross || "No summary yet."}
                    </p>
                  </div>
                </div>

                <div className="es-dx-note">
                  <p className="es-dx-note-title">Main challenge</p>
                  <p className="es-dx-note-copy">
                    {selected.report?.mainChallenge.summary ||
                      selected.mainFocus ||
                      "No summary yet."}
                  </p>
                </div>

                <div className="es-dx-columns">
                  <div className="es-dx-card">
                    <p className="es-dx-card-label">Strongest markers</p>
                    <ul className="es-dx-list">
                      {topStats(selected, "best").map((stat) => (
                        <li key={`best-${stat.id}`}>
                          <span>{stat.label}</span>
                          <strong>{stat.score}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="es-dx-card">
                    <p className="es-dx-card-label">Focus next</p>
                    <ul className="es-dx-list">
                      {topStats(selected, "worst").map((stat) => (
                        <li key={`worst-${stat.id}`}>
                          <span>{stat.label}</span>
                          <strong>{stat.score}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="es-dx-note">
                  <p className="es-dx-note-title">What to work on</p>
                  <p className="es-dx-note-copy">
                    {selected.report?.solutionsCopy || "No next-step guidance yet."}
                  </p>
                </div>
              </>
            )}
          </section>

          <aside className="es-dx-history">
            <div className="es-dx-history-head">
              <p className="es-dx-kicker">
                {diagnoses.length === 1 ? "This report" : "All reports"}
              </p>
              {diagnoses.length > 1 ? (
                <button
                  type="button"
                  className="es-dx-history-toggle"
                  onClick={() => setShowEarlier((value) => !value)}
                >
                  {showEarlier ? "Hide earlier" : `Show earlier (${diagnoses.length - 1})`}
                </button>
              ) : null}
            </div>
            <div className="es-dx-history-list">
              {diagnoses.map((row, index) => {
                const latestItem = index === 0;
                if (!latestItem && !showEarlier) return null;
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={[
                      "es-dx-history-item",
                      row.id === selected.id ? "es-dx-history-item--active" : "",
                      latestItem ? "es-dx-history-item--latest" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setSelectedId(row.id);
                      window.setTimeout(() => {
                        reportRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }, 30);
                    }}
                  >
                    <span className="es-dx-history-top">
                      <span className="es-dx-history-label">
                        {latestItem ? "Latest" : `Attempt ${diagnoses.length - index}`}
                      </span>
                      <span className="es-dx-history-score">
                        {row.overallScore != null ? `${row.overallScore}` : "—"}
                      </span>
                    </span>
                    <span className="es-dx-history-main">
                      {row.mainFocus || row.failureReason || "Report"}
                    </span>
                    <span className="es-dx-history-date">{formatStamp(row.createdAt)}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
