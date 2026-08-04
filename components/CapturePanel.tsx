"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioWaveform } from "@/components/AudioWaveform";
import {
  formatDuration,
  getMediaDuration,
  isAudioMime,
  MAX_DURATION_SECONDS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/validate-media";

type CapturePanelProps = {
  onAudioReady: (audio: File) => void;
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

export function CapturePanel({
  onAudioReady,
  onError,
  disabled = false,
}: CapturePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const [mode, setMode] = useState<"choose" | "record">("choose");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

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

  const processUpload = async (file: File) => {
    setBusy(true);
    onError("");
    try {
      const mime = file.type || "audio/mpeg";
      if (mime && !isAudioMime(mime) && !mime.startsWith("audio/")) {
        throw new Error("Use MP3, WAV, or M4A audio.");
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error("File is too large.");
      }
      try {
        const duration = await getMediaDuration(file);
        if (duration > MAX_DURATION_SECONDS + 2) {
          throw new Error("Recording must be 4 minutes or less.");
        }
      } catch (err) {
        if (err instanceof Error && /4 minutes/i.test(err.message)) throw err;
        // Some browsers can't read duration for all formats — continue
      }
      onAudioReady(file);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not use that file.");
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    clearTimer();
    setRecording(false);
    setLiveStream(null);
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    onError("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewFile(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setLiveStream(stream);
      const mime = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setLiveStream(null);
        cleanupStream();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `recording.${ext}`, { type: blob.type });
        const url = URL.createObjectURL(blob);
        setPreviewFile(file);
        setPreviewUrl(url);
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= MAX_DURATION_SECONDS) stopRecording();
      }, 200);
    } catch {
      setLiveStream(null);
      cleanupStream();
      onError("Could not access your microphone. Check permissions.");
    }
  }, [cleanupStream, onError, previewUrl, stopRecording]);

  if (mode === "record") {
    return (
      <section className="mx-auto w-full max-w-lg px-4 py-10 animate-fade-up">
        <button
          type="button"
          onClick={() => {
            if (recording) stopRecording();
            setMode("choose");
          }}
          className="mb-6 text-sm text-muted hover:text-foreground"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Record audio</h1>
        <p className="mt-2 text-sm text-muted">
          Speak for up to 4 minutes. Mic permission will be requested.
        </p>
        <p className="mt-6 text-3xl font-extrabold tabular-nums text-accent">
          {formatDuration(Math.min(elapsed, MAX_DURATION_SECONDS))}
        </p>

        {(recording || liveStream) && (
          <div className="mt-6">
            <AudioWaveform stream={liveStream} active={Boolean(liveStream)} />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {!recording && !previewFile && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startRecording()}
              className="btn-primary"
            >
              Start recording
            </button>
          )}
          {recording && (
            <button type="button" onClick={stopRecording} className="btn-secondary">
              Stop
            </button>
          )}
          {previewFile && !recording && (
            <>
              {previewUrl && (
                <audio className="w-full" controls src={previewUrl} preload="metadata" />
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAudioReady(previewFile)}
                className="btn-primary"
              >
                Analyze recording
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void startRecording()}
                className="btn-secondary"
              >
                Record again
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 animate-fade-up">
      <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
        Share up to 4 minutes of speaking.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted">
        Upload an existing clip or record a quick answer now. Choose whichever
        is easiest.
      </p>

      <div className="card-surface mt-8 overflow-hidden">
        <div className="grid md:grid-cols-2 md:divide-x md:divide-border">
          {/* Record — left / primary CTA */}
          <div className="relative flex flex-col items-center px-6 py-10 text-center sm:px-8">
            <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:right-6 sm:top-6 sm:text-xs">
              Recommended
            </span>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0M12 19v3m-4 0h8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-extrabold">Record audio</h2>
            <p className="mt-2 text-sm text-muted">
              Use your microphone to record a short response.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("record")}
              className="btn-primary mt-6 uppercase tracking-wide"
            >
              Record Audio
            </button>
            <p className="mt-3 text-xs text-muted">
              Mic permission will be requested.
            </p>
          </div>

          {/* Upload — right / secondary */}
          <div className="flex flex-col items-center border-t border-border px-6 py-10 text-center sm:px-8 md:border-t-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-extrabold">Upload audio</h2>
            <p className="mt-2 text-sm text-muted">
              Select an audio clip from your computer or phone.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,.mp3,.wav,.m4a"
              className="hidden"
              disabled={disabled || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="btn-secondary mt-6 uppercase tracking-wide"
            >
              {busy ? "Working…" : "Upload Audio"}
            </button>
            <p className="mt-3 text-xs text-muted">MP3, WAV, or M4A · Max 4 minutes</p>
          </div>
        </div>
      </div>
    </section>
  );
}
