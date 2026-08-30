"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDuration } from "@/lib/validate-media";

type AnalyzeFailedProps = {
  message: string;
  audio?: File | null;
  durationSec: number | null;
  retryWaitSec?: number;
  onRetry: () => void;
  onNewClip: () => void;
};

export function AnalyzeFailed({
  message,
  audio,
  durationSec,
  retryWaitSec = 0,
  onRetry,
  onNewClip,
}: AnalyzeFailedProps) {
  const [remaining, setRemaining] = useState(Math.max(0, retryWaitSec));
  const audioUrl = useMemo(
    () => (audio ? URL.createObjectURL(audio) : null),
    [audio],
  );

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    const start = Math.max(0, retryWaitSec);
    setRemaining(start);
    if (start <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryWaitSec, audio, message]);

  const canRetry = remaining <= 0;
  const lengthLabel =
    durationSec != null && Number.isFinite(durationSec)
      ? formatDuration(Math.round(durationSec))
      : null;

  return (
    <section className="mx-auto flex min-h-[75dvh] w-full max-w-md flex-col justify-center px-4 py-16 animate-fade-up">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
        Almost there
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
        We couldn&apos;t finish your{" "}
        <span className="bg-highlight px-1.5 box-decoration-clone">
          diagnosis
        </span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{message}</p>
      <p className="mt-2 text-sm text-muted">
        {audio
          ? "Your recording is still here. You don't need to speak again — wait a moment, then retry the same clip."
          : "Your YouTube link is still here. Wait a moment, then retry — no need to paste it again."}
      </p>

      {audioUrl ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">
            Your clip{lengthLabel ? ` · ${lengthLabel}` : ""}
          </p>
          <audio
            className="mt-3 w-full"
            controls
            src={audioUrl}
            preload="metadata"
          >
            Your browser can&apos;t play this preview.
          </audio>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={!canRetry}
          onClick={onRetry}
          className="btn-highlight disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canRetry
            ? audio
              ? "Retry this recording"
              : "Retry this YouTube clip"
            : `Retry available in ${remaining}s`}
        </button>
        <button
          type="button"
          onClick={onNewClip}
          className="text-center text-sm font-semibold text-muted underline-offset-2 hover:underline"
        >
          Try a different clip or link
        </button>
      </div>
    </section>
  );
}
