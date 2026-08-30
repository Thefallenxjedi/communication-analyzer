import type { CoachingClient } from "@/lib/coaching-clients";

export const CLIENT_SESSION_COOKIE = "es_client_email";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function readClientEmailFromCookie(request: Request): string {
  const raw = request.headers.get("cookie") || "";
  const parts = raw.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${CLIENT_SESSION_COOKIE}=`)) continue;
    return decodeURIComponent(
      trimmed.slice(CLIENT_SESSION_COOKIE.length + 1),
    ).trim();
  }
  return "";
}

export function clientSessionCookie(email: string): string {
  const value = encodeURIComponent(email.trim().toLowerCase());
  return `${CLIENT_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}`;
}

export function clearClientSessionCookie(): string {
  return `${CLIENT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export type ClientSession = Pick<
  CoachingClient,
  | "id"
  | "name"
  | "email"
  | "currentDay"
  | "programDays"
  | "currentFocus"
  | "meetingLink"
  | "status"
  | "currentStage"
  | "reviewRequired"
>;
