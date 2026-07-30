"use client";

import { useCallback, useRef, useState } from "react";
import { extractAudioFromVideo } from "@/lib/ffmpeg";
import { extractVideoFrames } from "@/lib/video-frames";
import {
  formatDuration,
  getMediaDuration,
  isAcceptedMedia,
  isVideoMime,
  MAX_DURATION_SECONDS,
  MAX_FILE_SIZE_BYTES,
  MAX_UPLOAD_DURATION_SECONDS,
} from "@/lib/validate-media";

export type PreparedMedia = {
  /** Audio track (or original audio file) for transcription */
  audio: File;
  /** Optional JPEG frames for face/hands/posture analysis */
  frames?: File[];
  /** True when source was video */
  fromVideo: boolean;
};

type UploadZoneProps = {
  onReady: (media: PreparedMedia) => void;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  embedded?: boolean;
};

export function UploadZone({
  onReady,
  onStatus,
  onError,
  disabled = false,
  embedded = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setBusy(true);
      onError("");
      setFileLabel(file.name);

      try {
        if (file.type && !isAcceptedMedia(file.type)) {
          throw new Error(
            "Unsupported format. Use audio (mp3, wav, m4a, webm) or video (mp4, webm, mov).",
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error("File is too large. Maximum size is 80 MB.");
        }

        onStatus("Checking duration…");
        const duration = await getMediaDuration(file);
        if (duration > MAX_UPLOAD_DURATION_SECONDS) {
          throw new Error(
            `Recording is ${formatDuration(duration)}. Maximum upload length is 5:00 (we analyze the first 4:00).`,
          );
        }
        if (duration > MAX_DURATION_SECONDS) {
          onStatus(
            `Clip is ${formatDuration(duration)} — analyzing the first 4:00…`,
          );
        }

        const isVideo =
          isVideoMime(file.type) ||
          /\.(mp4|webm|mov|avi|mpeg)$/i.test(file.name);

        if (isVideo) {
          onStatus("Capturing face & gesture frames…");
          const frames = await extractVideoFrames(file, 6);
          onStatus("Extracting audio…");
          const audio = await extractAudioFromVideo(file, onStatus);
          onStatus("Ready to analyze");
          onReady({ audio, frames, fromVideo: true });
        } else {
          onStatus("Ready to analyze");
          onReady({ audio: file, fromVideo: false });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not process this file.";
        onError(message);
        setFileLabel(null);
      } finally {
        setBusy(false);
      }
    },
    [onError, onReady, onStatus],
  );

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const dropZone = (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center border border-dashed px-6 py-16 transition ${
        dragging
          ? "border-accent bg-accent/5"
          : "border-border bg-card hover:border-muted"
      } ${disabled || busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm,video/quicktime,.mp3,.wav,.m4a,.mp4,.webm,.mov"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void processFile(file);
          e.target.value = "";
        }}
      />

      <p className="font-serif text-xl text-foreground">
        {busy
          ? "Preparing your file…"
          : fileLabel
            ? fileLabel
            : "Drop a file here"}
      </p>
      <p className="mt-2 text-sm text-muted">
        Audio or video up to 5 minutes — we analyze the first 4 minutes with
        EliteSpeak markers
      </p>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="mt-8 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-105 disabled:opacity-50"
      >
        {busy ? "Working…" : "Select audio or video"}
      </button>
    </div>
  );

  if (embedded) return dropZone;

  return (
    <section id="analyze" className="mx-auto w-full max-w-5xl px-6 pb-20">
      {dropZone}
    </section>
  );
}
