const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (ID_RE.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] || "";
    return ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && ID_RE.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") &&
      parts[1] &&
      ID_RE.test(parts[1])
    ) {
      return parts[1];
    }
  }
  return null;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function isYouTubeShortsUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      return url.pathname.split("/").filter(Boolean)[0] === "shorts";
    }
  } catch {
    /* ignore */
  }
  return false;
}
