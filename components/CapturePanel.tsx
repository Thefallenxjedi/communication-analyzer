"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { pickPromptQuestions } from "@/lib/prompt-questions";
import {
  formatDuration,
  getMediaDuration,
  isAudioMime,
  MAX_DURATION_SECONDS,
  MAX_FILE_SIZE_BYTES,
  MAX_UPLOAD_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from "@/lib/validate-media";

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

type CapturePanelProps = {
  onAudioReady: (audio: File, durationSec: number | null) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

type Mode = "choose" | "pick-question" | "record";

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
  const onAudioReadyRef = useRef(onAudioReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onAudioReadyRef.current = onAudioReady;
    onErrorRef.current = onError;
  }, [onAudioReady, onError]);

  const [mode, setMode] = useState<Mode>("choose");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");

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
    };
  }, [clearTimer, cleanupStream]);

  const goPickQuestion = () => {
    setQuestions(pickPromptQuestions(3));
    setSelectedQuestion("");
    setMode("pick-question");
  };

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
        if (duration < MIN_DURATION_SECONDS) {
          throw new Error(`Recording too short — please record again.`);
        }
        if (duration > MAX_UPLOAD_DURATION_SECONDS) {
          throw new Error("Audio must be 5 minutes or less.");
        }
        onAudioReady(file, Math.round(duration));
        return;
      } catch (err) {
        if (
          err instanceof Error &&
          /(5 minutes|too short|record again)/i.test(err.message)
        ) {
          throw err;
        }
      }
      onAudioReady(file, null);
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
    onErrorRef.current("");

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
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `recording.${ext}`, { type: blob.type });

        if (seconds < MIN_DURATION_SECONDS) {
          onErrorRef.current(`Recording too short — please record again.`);
          return;
        }

        onErrorRef.current("");
        onAudioReadyRef.current(file, Math.round(seconds));
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
      onErrorRef.current("Could not access your microphone. Check permissions.");
    }
  }, [cleanupStream, stopRecording]);

  if (mode === "pick-question") {
    return (
      <section className="mx-auto w-full max-w-lg px-4 py-10 animate-fade-up">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
          Step 2 — capture
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Pick one question to answer
        </h1>
        <p className="mt-2 text-sm text-muted">
          Open-ended is better. Talk about real work, a real project, a real
          conversation.
        </p>
        <ul className="mt-6 space-y-3">
          {questions.map((q) => {
            const selected = selectedQuestion === q;
            return (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(q)}
                  className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm leading-relaxed transition ${
                    selected
                      ? "border-foreground bg-highlight/50 font-semibold text-foreground"
                      : "border-border bg-card text-foreground/90 hover:border-foreground/40"
                  }`}
                >
                  {q}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          disabled={disabled || !selectedQuestion}
          onClick={() => setMode("record")}
          className="btn-highlight mt-6 uppercase tracking-wide"
        >
          Record audio
        </button>
        <button
          type="button"
          onClick={() => setMode("choose")}
          className="mt-3 w-full text-center text-sm text-muted underline-offset-2 hover:underline"
        >
          Back
        </button>
      </section>
    );
  }

  if (mode === "record") {
    const pastThirty = recording && elapsed >= 30;

    return (
      <section className="mx-auto w-full max-w-lg px-4 py-10 animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight">Record audio</h1>
        {selectedQuestion ? (
          <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
            {selectedQuestion}
          </p>
        ) : null}
        {!pastThirty ? (
          <p className="mt-3 text-sm text-muted">
            If you can get past 60 seconds, your insights will be much more
            valuable. Keep going.
          </p>
        ) : null}

        <p className="mt-6 text-3xl font-extrabold tabular-nums text-foreground">
          <span className="bg-highlight px-2 box-decoration-clone">
            {formatDuration(Math.min(elapsed, MAX_DURATION_SECONDS))}
          </span>
        </p>

        {pastThirty ? (
          <p
            className="mt-6 bg-highlight px-4 py-4 text-center text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl"
            role="status"
          >
            Keep going.
            <span className="mt-1 block text-base font-bold sm:text-lg">
              The longer you speak, the better your diagnosis.
            </span>
          </p>
        ) : null}

        {(recording || liveStream) && (
          <div className="mt-6">
            <AudioWaveform stream={liveStream} active={Boolean(liveStream)} />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {!recording && (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void startRecording()}
                className="btn-highlight"
              >
                Start recording
              </button>
              <button
                type="button"
                onClick={() => setMode("pick-question")}
                className="text-center text-sm text-muted underline-offset-2 hover:underline"
              >
                Pick a different question
              </button>
            </>
          )}
          {recording && (
            <button type="button" onClick={stopRecording} className="btn-highlight">
              Stop &amp; analyze
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-highlight px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground sm:text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          Step 2 — capture
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm font-semibold text-emerald-700">
          A minimum of 30 seconds of audio will help us analyze you better.
        </p>
      </div>

      <div className="card-surface mt-6 overflow-hidden">
        <div className="grid md:grid-cols-2 md:divide-x md:divide-border">
          <div className="relative flex flex-col items-center px-6 py-10 text-center sm:px-8">
            <span className="absolute right-4 top-4 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 sm:right-6 sm:top-6 sm:text-xs">
              Recommended
            </span>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
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
              Use your microphone and answer a question for 60 seconds.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={goPickQuestion}
              className="btn-highlight mt-6 uppercase tracking-wide"
            >
              Record Audio
            </button>
          </div>

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
              Select a clip or video from your computer or phone.
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
              className="btn-highlight mt-6 uppercase tracking-wide"
            >
              {busy ? "Working…" : "Upload Audio"}
            </button>
            <p className="mt-3 text-xs text-muted">MP3, WAV, or M4A</p>
          </div>
        </div>
      </div>
    </section>
  );
}
