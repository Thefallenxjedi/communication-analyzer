export const MAX_DURATION_SECONDS = 600; // record / upload audio max: 10 minutes
/** YouTube transcript-only (no audio) — longer clips are OK */
export const MAX_YOUTUBE_DURATION_SECONDS = 20 * 60; // 20 minutes
/** Suggested length for stronger results — not a hard block */
export const SUGGESTED_DURATION_SECONDS = 30;
/** Below this → ask to re-record; at/above → analyze */
export const MIN_DURATION_SECONDS = 10;
export const MAX_UPLOAD_DURATION_SECONDS = 620; // slight buffer on upload
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

const AUDIO_FILE_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "mpeg"] as const;

/** Phones often label an MP3 as blank or application/octet-stream. */
export function isAcceptedAudioFile(file: { name: string; type: string }): boolean {
  const mime = file.type.split(";")[0].trim().toLowerCase();
  if (mime.startsWith("video/")) return false;
  if (mime && isAudioMime(mime)) return true;
  if (mime && mime !== "application/octet-stream") return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_FILE_EXTENSIONS.includes(ext as (typeof AUDIO_FILE_EXTENSIONS)[number]);
}

/**
 * Read media duration. The element must be in the document — Safari does not
 * load metadata for an off-DOM audio element, so an MP3 upload would hang.
 */
export function getMediaDuration(file: File, timeoutMs = 8000): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isVideo = isVideoMime(file.type);
    const el = document.createElement(isVideo ? "video" : "audio");
    el.preload = "metadata";
    el.setAttribute("playsinline", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      el.load();
      el.remove();
      fn();
    };

    const timer = window.setTimeout(() => {
      finish(() => reject(new Error("Could not determine media duration.")));
    }, timeoutMs);

    const onReady = () => {
      const duration = el.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      finish(() => resolve(duration));
    };

    el.onloadedmetadata = onReady;
    el.ondurationchange = onReady;
    el.onerror = () => {
      finish(() => reject(new Error("Could not read this media file.")));
    };

    el.src = url;
    el.load();
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

/** Reject counting, digit-only, or too-thin clips before Gemini diagnosis. */
export function isUnusableSpeechTranscript(transcript: string): boolean {
  const t = transcript.replace(/\s+/g, " ").trim();
  if (t.length < 12) return true;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 3) return true;

  const letterWords = words.filter((w) => /[a-zA-Z]{2,}/.test(w));
  if (letterWords.length < 3) return true;

  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  const digits = (t.match(/\d/g) || []).length;
  if (digits > 0 && digits >= letters) return true;

  return false;
}
