"use client";

import { useEffect, useRef, useState } from "react";

const YOUTUBE_ID = "Yt8lcHX92As";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YtPlayer }) => void;
            onStateChange?: (e: { data: number; target: YtPlayer }) => void;
          };
        },
      ) => YtPlayer;
      PlayerState?: { PLAYING: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YtPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  unMute: () => void;
  mute: () => void;
  isMuted: () => boolean;
  setVolume: (n: number) => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
};

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

/** Autoplay ASAP; unmute with sound on first tap (browsers block unmuted autoplay). */
export function IntroVideoPlayer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const [needsSound, setNeedsSound] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unlock = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        p.unMute();
        p.setVolume(100);
        p.playVideo();
        setNeedsSound(false);
      } catch {
        // ignore
      }
    };

    void (async () => {
      await loadYouTubeApi();
      if (cancelled || !hostRef.current || !window.YT?.Player) return;

      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId: YOUTUBE_ID,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1, // required for autoplay to start immediately
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            e.target.playVideo();
            // Try unmute immediately — works if browser already has a gesture
            try {
              e.target.unMute();
              e.target.setVolume(100);
              if (!e.target.isMuted()) setNeedsSound(false);
            } catch {
              // stay muted until tap
            }
          },
        },
      });
    })();

    const onFirstGesture = () => {
      unlock();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, []);

  const enableSound = () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.unMute();
      p.setVolume(100);
      // Restart so the intro is heard with sound from the start
      p.seekTo(0, true);
      p.playVideo();
      setNeedsSound(false);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative aspect-video w-full">
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />
      {needsSound ? (
        <button
          type="button"
          onClick={enableSound}
          className="absolute inset-x-0 bottom-3 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-highlight px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground shadow-[0_8px_24px_rgba(255,230,0,0.5)] sm:bottom-4 sm:text-sm"
        >
          Tap for sound
        </button>
      ) : null}
    </div>
  );
}
