"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipPlayer } from "@/components/ClipPlayer";

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

type TaskRecorderProps = {
  onReady: (file: File, durationSec: number) => void;
  disabled?: boolean;
  look?: "default" | "client";
};

export function TaskRecorder({
  onReady,
  disabled = false,
  look = "default",
}: TaskRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const onReadyRef = useRef(onReady);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [cleanupStream, previewUrl]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
        cleanupStream();
        const seconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `task.${ext}`, { type: blob.type });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
        onReadyRef.current(file, seconds);
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 200);
    } catch {
      cleanupStream();
      setError("Could not access the microphone.");
    }
  }, [cleanupStream, previewUrl]);

  const recordBtn = recording ? (
    <button
      type="button"
      onClick={stopRecording}
      className={
        look === "client"
          ? "es-btn"
          : "rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white"
      }
    >
      Stop · {elapsed}s
    </button>
  ) : (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void startRecording()}
      className={
        look === "client"
          ? "es-btn"
          : "rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-55"
      }
    >
      {previewUrl ? "Re-record" : "Record"}
    </button>
  );

  if (look === "client") {
    return (
      <div className="es-recorder">
        {recordBtn}
        {previewUrl ? <ClipPlayer src={previewUrl} /> : null}
        {error ? (
          <p className="text-sm" style={{ color: "var(--es-ember)" }}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{recordBtn}</div>
      {previewUrl ? <audio controls src={previewUrl} className="w-full" /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
