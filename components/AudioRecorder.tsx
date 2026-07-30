"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_DURATION_SECONDS, formatDuration } from "@/lib/validate-media";

type AudioRecorderProps = {
  onReady: (audioFile: File) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return "";
}

export function AudioRecorder({
  onReady,
  onError,
  disabled = false,
}: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      cleanupStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [clearTimer, cleanupStream, previewUrl]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    clearTimer();
    setRecording(false);
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    onError("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewFile(null);
    setElapsed(0);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      onError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        cleanupStream();
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4")
          ? "m4a"
          : type.includes("ogg")
            ? "ogg"
            : "webm";
        const file = new File([blob], `recording.${ext}`, { type });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewFile(file);
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setRecording(true);

      timerRef.current = setInterval(() => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= MAX_DURATION_SECONDS) {
          stopRecording();
        }
      }, 200);
    } catch {
      cleanupStream();
      onError(
        "Could not access the microphone. Allow mic permission and try again.",
      );
    }
  }, [cleanupStream, onError, previewUrl, stopRecording]);

  return (
    <div className="border border-border bg-card/30 p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-2xl text-foreground">Record audio</h3>
          <p className="mt-2 text-sm text-muted">
            Speak for up to 4 minutes, then send the clip for analysis.
          </p>
        </div>
        <p className="font-serif text-2xl tabular-nums text-accent">
          {formatDuration(Math.min(elapsed, MAX_DURATION_SECONDS))}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void startRecording()}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-110 disabled:opacity-50"
          >
            Start recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full border border-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent transition hover:bg-accent/10"
          >
            Stop
          </button>
        )}

        {previewFile && !recording && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onReady(previewFile)}
            className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Analyze recording
          </button>
        )}
      </div>

      {recording && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Recording… stop anytime or we auto-stop at 4:00.
        </p>
      )}

      {previewUrl && !recording && (
        <audio
          className="mt-6 w-full"
          controls
          src={previewUrl}
          preload="metadata"
        />
      )}
    </div>
  );
}
