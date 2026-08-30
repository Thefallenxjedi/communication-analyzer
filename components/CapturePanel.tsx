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
import type { CaptureMethod } from "@/lib/capture-method";

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

/** YouTube link capture (beta). Full analysis when RAPIDAPI_KEY is set; transcript-only fallback otherwise. */
const SHOW_YOUTUBE_CAPTURE = true;

function YouTubeLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
      />
      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

type CapturePanelProps = {
  onAudioReady: (
    audio: File,
    durationSec: number | null,
    promptQuestion?: string,
    captureMethod?: CaptureMethod,
  ) => void;
  onYoutubeReady?: (url: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

type Mode = "choose" | "pick-question" | "record" | "youtube";

export function CapturePanel({
  onAudioReady,
  onYoutubeReady,
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
  const selectedQuestionRef = useRef("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  useEffect(() => {
    selectedQuestionRef.current = selectedQuestion;
  }, [selectedQuestion]);

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
        onAudioReady(
          file,
          Math.round(duration),
          selectedQuestionRef.current.trim() || undefined,
          "upload",
        );
        return;
      } catch (err) {
        if (
          err instanceof Error &&
          /(5 minutes|too short|record again)/i.test(err.message)
        ) {
          throw err;
        }
      }
      onAudioReady(
        file,
        null,
        selectedQuestionRef.current.trim() || undefined,
        "upload",
      );
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
        onAudioReadyRef.current(
          file,
          Math.round(seconds),
          selectedQuestionRef.current.trim() || undefined,
          "realtime",
        );
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

  if (mode === "youtube") {
    return (
      <section className="mx-auto w-full max-w-lg px-4 py-10 animate-fade-up">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
          Step 2 — capture
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff5f5] ring-1 ring-[#ff0000]/15">
            <YouTubeLogo className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Paste a YouTube link{" "}
            <span className="text-base font-bold uppercase tracking-wide text-muted">
              (beta)
            </span>
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          Public video up to 20 minutes — Shorts included. We pull captions and
          audio when possible; Shorts without captions use audio + AI
          transcription instead.
        </p>
        <p className="mt-2 text-sm text-muted">
          Analysis usually takes{" "}
          <span className="font-semibold text-foreground">3–5 minutes</span> —
          longer videos need more time to download and score.
        </p>
        <label className="mt-6 block text-left text-xs font-extrabold uppercase tracking-wide text-muted">
          YouTube URL
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <YouTubeLogo className="h-5 w-5" />
          </span>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none ring-accent focus:ring-2"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          disabled={disabled || !youtubeUrl.trim()}
          onClick={() => {
            onError("");
            onYoutubeReady?.(youtubeUrl.trim());
          }}
          className="btn-highlight mt-6 flex w-full items-center justify-center gap-2 uppercase tracking-wide"
        >
          <YouTubeLogo className="h-5 w-5" />
          Analyze YouTube clip
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
      <section className="mx-auto w-full max-w-lg px-4 py-8 animate-fade-up sm:py-10">
        <h1 className="text-2xl font-extrabold tracking-tight">Record audio</h1>
        {selectedQuestion ? (
          <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
            {selectedQuestion}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col items-center text-center">
          <p className="text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
            <span className="inline-block min-w-[5.5rem] rounded-2xl bg-highlight px-4 py-2">
              {formatDuration(Math.min(elapsed, MAX_DURATION_SECONDS))}
            </span>
          </p>

          {pastThirty ? (
            <div
              className="mt-4 flex max-w-xs items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3 text-left"
              role="status"
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-extrabold text-white"
                aria-hidden
              >
                ✓
              </span>
              <div>
                <p className="text-sm font-extrabold text-emerald-900">
                  Minimum reached — keep going
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-emerald-800/80">
                  The longer you speak, the sharper your diagnosis.
                </p>
              </div>
            </div>
          ) : null}

          {(recording || liveStream) && (
            <div className="mt-6 w-full">
              <AudioWaveform stream={liveStream} active={Boolean(liveStream)} />
            </div>
          )}
        </div>

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
    <section className="mx-auto w-full max-w-3xl px-4 py-6 animate-fade-up md:py-10">
      <div className="flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-highlight px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground sm:text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          Step 2 — capture
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold text-emerald-700 md:mt-4">
          A minimum of 30 seconds of audio will help us analyze you better.
        </p>
      </div>

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

      <div className="card-surface mt-4 overflow-hidden md:mt-6">
        {/* Mobile: Record prominent on top; Upload + YouTube squares below */}
        <div className="space-y-2 p-3 md:hidden">
          <div className="relative rounded-xl border border-emerald-200/80 bg-emerald-50/30 px-4 py-5 text-center">
            <span className="absolute right-3 top-3 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-800">
              Recommended
            </span>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0M12 19v3m-4 0h8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-3 text-base font-extrabold">Record audio</h2>
            <p className="mt-1 text-xs text-muted">
              Use your mic and answer a question for 30 seconds or more.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={goPickQuestion}
              className="btn-highlight mt-4 uppercase tracking-wide"
            >
              Record Audio
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              aria-label="Upload an audio file"
              className="flex aspect-square flex-col items-center justify-center rounded-xl border border-border bg-card p-2 text-center transition hover:border-accent/40 hover:bg-accent-soft/30 disabled:opacity-55"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="mt-2 text-xs font-extrabold leading-tight">
                {busy ? "Working…" : "Upload"}
              </span>
              <span className="mt-0.5 text-[10px] text-muted">MP3, WAV, M4A</span>
            </button>

            {SHOW_YOUTUBE_CAPTURE && onYoutubeReady ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onError("");
                  setMode("youtube");
                }}
                aria-label="Paste a YouTube link for transcript analysis"
                className="flex aspect-square flex-col items-center justify-center rounded-xl border border-border bg-card p-2 text-center transition hover:border-[#ff0000]/30 hover:bg-[#fff5f5] disabled:opacity-55"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff5f5] ring-1 ring-[#ff0000]/15">
                  <YouTubeLogo className="h-6 w-6" />
                </div>
                <span className="mt-2 text-xs font-extrabold leading-tight">
                  YouTube
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Beta
                </span>
              </button>
            ) : (
              <div aria-hidden className="aspect-square" />
            )}
          </div>
        </div>

        {/* Desktop: full cards with descriptions and buttons */}
        <div className="hidden md:block">
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
                Use your mic and answer a question for 30 seconds or more.
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

            <div className="flex flex-col items-center px-6 py-10 text-center sm:px-8">
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
          {SHOW_YOUTUBE_CAPTURE && onYoutubeReady ? (
            <div className="border-t border-border px-6 py-8 text-center sm:px-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5f5] ring-1 ring-[#ff0000]/15">
                <YouTubeLogo className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-lg font-extrabold">
                YouTube link{" "}
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Beta
                </span>
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Public videos and Shorts up to 20 minutes. Full analysis with
                captions + audio, or audio-only for Shorts without captions.
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onError("");
                  setMode("youtube");
                }}
                className="btn-highlight mx-auto mt-5 inline-flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <YouTubeLogo className="h-5 w-5" />
                Paste YouTube URL
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
