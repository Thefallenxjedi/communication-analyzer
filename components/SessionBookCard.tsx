"use client";

import {
  LIVE_CALL_TOTAL,
  PRIVATE_SESSION_BOOK_URL,
  sessionLabel,
} from "@/lib/coaching-program";
import type { LiveCallProgress } from "@/lib/coaching-sessions";

export function LiveCallProgressBar({
  progress,
}: {
  progress: LiveCallProgress | null;
}) {
  const total = progress?.total ?? LIVE_CALL_TOTAL;
  const completed = progress?.completed ?? 0;
  const remaining = progress?.remaining ?? total;

  return (
    <div className="es-call-progress" aria-label={`${completed} of ${total} calls completed`}>
      <div className="es-call-progress-head">
        <span className="es-call-progress-label">Calls</span>
        <span className="es-call-progress-count">
          {completed} / {total}
        </span>
      </div>
      <div className="es-call-progress-dots" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={
              i < completed
                ? "es-call-progress-dot es-call-progress-dot--done"
                : "es-call-progress-dot"
            }
          />
        ))}
      </div>
      <p className="es-call-progress-remain">
        {remaining === 0
          ? "All calls complete"
          : `${remaining} remaining`}
      </p>
    </div>
  );
}

export function SessionBookCard({
  sessionNumber,
  completed,
  completedAt,
  readOnly = false,
}: {
  sessionNumber: number;
  completed: boolean;
  completedAt?: string;
  readOnly?: boolean;
}) {
  const label = sessionLabel(sessionNumber);
  const when =
    completedAt && !Number.isNaN(Date.parse(completedAt))
      ? new Date(completedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

  if (completed) {
    return (
      <div className="es-book-card es-book-card--done">
        <p className="es-book-card-kicker">Live call</p>
        <p className="es-book-card-title">
          <span className="es-book-card-tick" aria-hidden>
            ✓
          </span>{" "}
          {label} complete
        </p>
        {when ? <p className="es-book-card-meta">Concluded {when}</p> : null}
      </div>
    );
  }

  return (
    <div className="es-book-card">
      <p className="es-book-card-kicker">Live call</p>
      <p className="es-book-card-title">Book {label}</p>
      <p className="es-book-card-meta">
        Schedule your private session with your coach.
      </p>
      {readOnly ? (
        <p className="es-book-card-demo">Demo preview — booking opens for real clients.</p>
      ) : (
        <a
          href={PRIVATE_SESSION_BOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="es-btn es-book-card-btn"
        >
          Book this session
        </a>
      )}
    </div>
  );
}
