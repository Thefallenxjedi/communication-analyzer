"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_DURATION_SECONDS, formatDuration } from "@/lib/validate-media";

type VideoRecorderProps = {
  onReady: (videoFile: File) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

function pickVideoMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
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

export function VideoRecorder({
  onReady,
  onError,
  disabled = false,
}: VideoRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
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

  const startCameraPreview = useCallback(async () => {
    onError("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewFile(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      onError("Camera recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setPreviewing(true);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => undefined);
      }
    } catch {
      cleanupStream();
      onError(
        "Could not access camera/mic. Allow permissions and try again.",
      );
    }
  }, [cleanupStream, onError, previewUrl]);

  const startRecording = useCallback(async () => {
    onError("");
    try {
      let stream = streamRef.current;
      if (!stream) {
        await startCameraPreview();
        stream = streamRef.current;
      }
      if (!stream) return;

      chunksRef.current = [];
      const mimeType = pickVideoMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 1_200_000,
            audioBitsPerSecond: 96_000,
          })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `recording.${ext}`, { type });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewFile(file);
        cleanupStream();
        setPreviewing(false);
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= MAX_DURATION_SECONDS) {
          stopRecording();
        }
      }, 200);
    } catch {
      cleanupStream();
      onError("Could not start video recording.");
    }
  }, [cleanupStream, onError, startCameraPreview, stopRecording]);

  return (
    <div className="border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-2xl text-foreground">Record video</h3>
          <p className="mt-2 text-sm text-muted">
            Speak for up to 4 minutes. We score face, hands, eye contact, and
            presence alongside your speech.
          </p>
        </div>
        <p className="font-serif text-2xl tabular-nums text-accent">
          {formatDuration(Math.min(elapsed, MAX_DURATION_SECONDS))}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-black">
        {previewUrl && !recording ? (
          <video
            className="aspect-video w-full object-cover"
            src={previewUrl}
            controls
            playsInline
          />
        ) : (
          <video
            ref={liveVideoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
            autoPlay
          />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!previewing && !recording && !previewFile && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void startCameraPreview()}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-110 disabled:opacity-50"
          >
            Open camera
          </button>
        )}

        {previewing && !recording && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void startRecording()}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-110 disabled:opacity-50"
          >
            Start recording
          </button>
        )}

        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full border border-red-400/60 px-6 py-3 text-sm font-semibold tracking-wide text-red-400 transition hover:bg-red-500/10"
          >
            Stop
          </button>
        )}

        {previewFile && !recording && (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onReady(previewFile)}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-110 disabled:opacity-50"
            >
              Analyze video
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startCameraPreview()}
              className="rounded-full border border-border px-6 py-3 text-sm text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Record again
            </button>
          </>
        )}
      </div>

      {recording && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Recording… include face and hands in frame when possible.
        </p>
      )}
    </div>
  );
}
