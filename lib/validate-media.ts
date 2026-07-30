export const MAX_DURATION_SECONDS = 240; // process / record max: 4 minutes
export const MAX_UPLOAD_DURATION_SECONDS = 300; // allow up to 5 min upload; trim to 4
export const MAX_FILE_SIZE_BYTES = 80 * 1024 * 1024; // 80 MB phone videos

export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
] as const;

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
] as const;

export function isAudioMime(mime: string): boolean {
  const base = mime.split(";")[0].trim().toLowerCase();
  return (
    ACCEPTED_AUDIO_TYPES.includes(base as (typeof ACCEPTED_AUDIO_TYPES)[number]) ||
    base.startsWith("audio/")
  );
}

export function isVideoMime(mime: string): boolean {
  const base = mime.split(";")[0].trim().toLowerCase();
  return (
    ACCEPTED_VIDEO_TYPES.includes(base as (typeof ACCEPTED_VIDEO_TYPES)[number]) ||
    base.startsWith("video/")
  );
}

export function isAcceptedMedia(mime: string): boolean {
  return isAudioMime(mime) || isVideoMime(mime);
}

/** Read media duration via HTML5 element metadata. */
export function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isVideo = isVideoMime(file.type);
    const el = document.createElement(isVideo ? "video" : "audio");
    el.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      el.load();
    };

    el.onloadedmetadata = () => {
      const duration = el.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not determine media duration."));
        return;
      }
      resolve(duration);
    };

    el.onerror = () => {
      cleanup();
      reject(new Error("Could not read this media file."));
    };

    el.src = url;
  });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Normalize common YouTube URL shapes to a canonical watch URL. */
export function parseYouTubeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/watch?v=${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/watch?v=${v}`;

      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
        const id = parts[1];
        return id ? `https://www.youtube.com/watch?v=${id}` : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}
