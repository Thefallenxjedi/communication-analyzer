"use client";

import { useEffect, useRef, useState } from "react";

type AudioWaveformProps = {
  stream: MediaStream | null;
  active: boolean;
};

const BAR_COUNT = 28;

export function AudioWaveform({ stream, active }: AudioWaveformProps) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.12),
  );
  const levelsSmooth = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, () => 0.12),
  );

  useEffect(() => {
    if (!active || !stream) return;

    let cancelled = false;
    let raf = 0;
    let ctx: AudioContext | null = null;
    let clone: MediaStream | null = null;

    const run = async () => {
      try {
        // Clone so MediaRecorder + analyser don't fight over the same stream
        clone = stream.clone();
        const AC =
          window.AudioContext ||
          (
            window as unknown as {
              webkitAudioContext: typeof AudioContext;
            }
          ).webkitAudioContext;
        ctx = new AC();
        await ctx.resume();

        const source = ctx.createMediaStreamSource(clone);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.65;
        source.connect(analyser);

        const time = new Uint8Array(analyser.fftSize);
        const freq = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(tick);

          analyser.getByteTimeDomainData(time);
          analyser.getByteFrequencyData(freq);

          // Overall loudness from waveform
          let sum = 0;
          for (let i = 0; i < time.length; i++) {
            const v = (time[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / time.length);
          const boost = Math.min(1, rms * 4.5);

          const next = levelsSmooth.current;
          for (let i = 0; i < BAR_COUNT; i++) {
            // Map across frequency bins for shape + mix in RMS so speech always moves bars
            const fi = Math.floor((i / BAR_COUNT) * (freq.length * 0.45));
            const f = (freq[fi] ?? 0) / 255;
            const target = Math.max(0.1, Math.min(1, f * 0.85 + boost * 0.9));
            next[i] = next[i] * 0.55 + target * 0.45;
          }
          setLevels([...next]);
        };

        tick();
      } catch (err) {
        console.warn("[waveform]", err);
        // Fallback idle animation so UI never looks broken
        const idle = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(idle);
          const t = Date.now() / 280;
          setLevels(
            Array.from({ length: BAR_COUNT }, (_, i) => {
              return 0.15 + 0.35 * Math.abs(Math.sin(t + i * 0.35));
            }),
          );
        };
        idle();
      }
    };

    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clone?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [active, stream]);

  return (
    <div className="card-surface w-full overflow-hidden px-4 py-4">
      <div
        className="flex h-16 items-center justify-center gap-[3px] sm:h-20 sm:gap-1"
        role="img"
        aria-label="Live audio waveform"
      >
        {levels.map((level, i) => (
          <span
            key={i}
            className="w-[3px] shrink-0 rounded-full bg-highlight sm:w-1.5"
            style={{
              height: `${Math.round(12 + level * 88)}%`,
              opacity: 0.55 + level * 0.45,
              transition: "height 60ms linear",
            }}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-medium text-foreground">
        Listening… speak into your mic
      </p>
    </div>
  );
}
