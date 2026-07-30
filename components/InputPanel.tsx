"use client";

import { useState } from "react";
import { UploadZone, type PreparedMedia } from "@/components/UploadZone";
import { AudioRecorder } from "@/components/AudioRecorder";
import { VideoRecorder } from "@/components/VideoRecorder";
import { TextPaste } from "@/components/TextPaste";
import { YouTubeInput } from "@/components/YouTubeInput";
import { extractAudioFromVideo } from "@/lib/ffmpeg";
import { extractVideoFrames } from "@/lib/video-frames";

type InputMode =
  | "upload"
  | "youtube"
  | "record-audio"
  | "record-video"
  | "text";

type InputPanelProps = {
  onMediaReady: (media: PreparedMedia) => void;
  onTextReady: (transcript: string) => void;
  onYouTubeReady: (youtubeUrl: string) => void;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

const TABS: { id: InputMode; label: string }[] = [
  { id: "record-audio", label: "Record audio" },
  { id: "record-video", label: "Record video" },
  { id: "youtube", label: "YouTube" },
  { id: "upload", label: "Upload" },
  { id: "text", label: "Paste text" },
];

export function InputPanel({
  onMediaReady,
  onTextReady,
  onYouTubeReady,
  onStatus,
  onError,
  disabled = false,
}: InputPanelProps) {
  const [mode, setMode] = useState<InputMode>("record-audio");
  const [busy, setBusy] = useState(false);

  const prepareVideo = async (videoFile: File) => {
    setBusy(true);
    onError("");
    try {
      onStatus("Capturing face & gesture frames…");
      const frames = await extractVideoFrames(videoFile, 6);
      onStatus("Extracting audio (first 4 minutes)…");
      const audio = await extractAudioFromVideo(videoFile, onStatus);
      onStatus("Ready to analyze");
      onMediaReady({ audio, frames, fromVideo: true });
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Could not prepare video.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="analyze" className="mx-auto w-full max-w-5xl px-6 pb-20">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon">
          Free report
        </p>
        <div className="hairline my-4 max-w-xs" />
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Analyze your communication
        </h2>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">
          Record audio, video, or drop a YouTube link — we analyze up to 4
          minutes.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setMode(tab.id);
              onError("");
            }}
            className={`rounded-full px-5 py-2 text-sm tracking-wide transition ${
              mode === tab.id
                ? "btn-neon"
                : "border border-border text-zinc-400 hover:border-neon hover:text-neon"
            } disabled:opacity-50`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white/[0.03] p-1">
        {mode === "upload" && (
          <UploadZone
            embedded
            onReady={onMediaReady}
            onStatus={onStatus}
            onError={onError}
            disabled={disabled || busy}
          />
        )}
        {mode === "youtube" && (
          <YouTubeInput
            onSubmit={onYouTubeReady}
            disabled={disabled || busy}
          />
        )}
        {mode === "record-audio" && (
          <AudioRecorder
            onReady={(audio) => onMediaReady({ audio, fromVideo: false })}
            onError={onError}
            disabled={disabled || busy}
          />
        )}
        {mode === "record-video" && (
          <VideoRecorder
            onReady={(video) => void prepareVideo(video)}
            onError={onError}
            disabled={disabled || busy}
          />
        )}
        {mode === "text" && (
          <TextPaste onSubmit={onTextReady} disabled={disabled || busy} />
        )}
      </div>
    </section>
  );
}
