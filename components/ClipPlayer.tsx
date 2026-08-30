"use client";

import { useEffect, useRef, useState } from "react";

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClipPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLButtonElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

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
    if (!el || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrent(el.currentTime);
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="es-clip">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) ? d : 0);
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
