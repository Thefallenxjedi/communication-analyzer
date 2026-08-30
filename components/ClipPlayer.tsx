"use client";

import { useEffect, useRef, useState } from "react";

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function usableDuration(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function ClipPlayer({
  src,
  durationSec,
}: {
  src: string;
  durationSec?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLButtonElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(usableDuration(durationSec ?? 0));

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(usableDuration(durationSec ?? 0));
  }, [src, durationSec]);

  function rememberDuration(el: HTMLAudioElement) {
    const fromMedia = usableDuration(el.duration);
    if (fromMedia > 0) {
      setDuration(fromMedia);
      return fromMedia;
    }
    const fromTime = usableDuration(el.currentTime);
    if (fromTime > 0) {
      setDuration((prev) => (prev > fromTime ? prev : fromTime));
    }
    return fromTime;
  }

  function probeDuration(el: HTMLAudioElement) {
    if (usableDuration(el.duration) > 0) {
      setDuration(el.duration);
      return;
    }
    const start = el.currentTime;
    const onSeeked = () => {
      el.removeEventListener("seeked", onSeeked);
      const found = usableDuration(el.duration) || usableDuration(el.currentTime);
      if (found > 0) setDuration(found);
      try {
        el.currentTime = start;
      } catch {
        /* ignore */
      }
    };
    el.addEventListener("seeked", onSeeked);
    try {
      el.currentTime = 1e8;
    } catch {
      el.removeEventListener("seeked", onSeeked);
    }
  }

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  function seek(clientX: number) {
    const el = audioRef.current;
    const bar = barRef.current;
    const length = duration;
    if (!el || !bar || length <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * length;
    setCurrent(el.currentTime);
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="es-clip">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          if (usableDuration(e.currentTarget.duration) > 0) {
            setDuration(e.currentTarget.duration);
          } else {
            probeDuration(e.currentTarget);
          }
        }}
        onDurationChange={(e) => rememberDuration(e.currentTarget)}
        onTimeUpdate={(e) => {
          setCurrent(e.currentTarget.currentTime);
          rememberDuration(e.currentTarget);
        }}
        onEnded={(e) => {
          setPlaying(false);
          const stopped = rememberDuration(e.currentTarget);
          setCurrent(stopped || e.currentTarget.currentTime);
        }}
      />
      <button
        type="button"
        className="es-clip-play"
        aria-label={playing ? "Pause" : "Play"}
        onClick={toggle}
      >
        {playing ? (
          <span className="es-clip-pause" aria-hidden />
        ) : (
          <span className="es-clip-tri" aria-hidden />
        )}
      </button>
      <span className="es-clip-time">{fmt(current)}</span>
      <button
        ref={barRef}
        type="button"
        className="es-clip-bar"
        aria-label="Seek"
        onClick={(e) => seek(e.clientX)}
      >
        <span className="es-clip-fill" style={{ width: `${pct}%` }} />
      </button>
      <span className="es-clip-time">{fmt(duration)}</span>
    </div>
  );
}
