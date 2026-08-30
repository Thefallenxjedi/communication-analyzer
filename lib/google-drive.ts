const DRIVE_URL_MAX = 500;

export function normalizeGoogleDriveUrl(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, DRIVE_URL_MAX);
  if (!trimmed) {
    throw new Error("Paste a Google Drive link.");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Paste a full Google Drive link, starting with https://");
  }
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (parsed.protocol !== "https:") {
    throw new Error("Use an https Google Drive link.");
  }
  if (host !== "drive.google.com") {
    throw new Error("Use a Google Drive share link (drive.google.com).");
  }
  return parsed.toString();
}
