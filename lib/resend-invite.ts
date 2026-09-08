import { Resend } from "resend";
import { isSampleClientEmail } from "@/lib/sample-client";

const DEFAULT_EVENT_NAME = "user_registered";
const SESSION_COMPLETED_EVENT_NAME = "session_completed";

export type ClientInviteInput = {
  name: string;
  email: string;
};

export type ClientInviteResult = {
  configured: boolean;
  sent: boolean;
  enrolled: boolean;
  error?: string;
};

export type SessionCompletedEventInput = {
  name: string;
  email: string;
  sessionNumber: number;
};

export type SessionCompletedEventResult = {
  configured: boolean;
  sent: boolean;
  error?: string;
};

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function clientJoinUrl(): string {
  const fromEnv = env("RESEND_JOIN_URL");
  if (fromEnv) return fromEnv;
  const base = (
    env("NEXT_PUBLIC_APP_URL") || "https://app.elitespeakprogram.com"
  ).replace(/\/$/, "");
  return `${base}/client/login`;
}

export function isResendConfigured(): boolean {
  return Boolean(env("RESEND_API_KEY"));
}

function getResend(): Resend | null {
  const key = env("RESEND_API_KEY");
  if (!key) return null;
  return new Resend(key);
}

function resendErrorMessage(error: unknown): string {
  if (!error) return "Resend request failed.";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Resend request failed.";
}

/**
 * Sends the custom event configured as the Resend automation trigger.
 * Resend creates the audience contact automatically when needed.
 */
async function triggerWelcomeAutomation(
  resend: Resend,
  input: { email: string; clientName: string },
): Promise<boolean> {
  const eventName = env("RESEND_EVENT_NAME") || DEFAULT_EVENT_NAME;
  const result = await resend.events.send({
    event: eventName,
    email: input.email,
    payload: {
      JOIN_URL: clientJoinUrl(),
      CLIENT_NAME: input.clientName,
    },
  });
  if (result.error) throw new Error(resendErrorMessage(result.error));
  return true;
}

/**
 * Triggers the Resend-hosted welcome automation. No template is rendered or
 * email is sent directly by this application.
 */
export async function enrollAndInviteClient(
  input: ClientInviteInput,
): Promise<ClientInviteResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) {
    return {
      configured: isResendConfigured(),
      sent: false,
      enrolled: false,
      error: "Name and email are required to enroll the client.",
    };
  }
  if (isSampleClientEmail(email)) {
    return { configured: isResendConfigured(), sent: false, enrolled: false };
  }

  const resendClient = getResend();
  if (!resendClient) {
    return { configured: false, sent: false, enrolled: false };
  }

  try {
    const triggered = await triggerWelcomeAutomation(resendClient, {
      email,
      clientName: name,
    });
    return {
      configured: true,
      sent: triggered,
      enrolled: triggered,
    };
  } catch (err) {
    return {
      configured: true,
      sent: false,
      enrolled: false,
      error: resendErrorMessage(err),
    };
  }
}

function completedSessionName(sessionNumber: number): string {
  const normalized = Math.max(1, Math.round(sessionNumber));
  return `Session ${normalized}`;
}

/**
 * Triggers the Resend-hosted session completion automation.
 * Intro Call (0) and internal Session 1 both resolve to "Session 1".
 */
export async function sendSessionCompletedEvent(
  input: SessionCompletedEventInput,
): Promise<SessionCompletedEventResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) {
    return {
      configured: isResendConfigured(),
      sent: false,
      error: "Client name and email are required.",
    };
  }
  if (isSampleClientEmail(email)) {
    return { configured: isResendConfigured(), sent: false };
  }

  const resendClient = getResend();
  if (!resendClient) {
    return { configured: false, sent: false };
  }

  const result = await resendClient.events.send({
    event: SESSION_COMPLETED_EVENT_NAME,
    email,
    payload: {
      CLIENT_NAME: name,
      SESSION_NAME: completedSessionName(input.sessionNumber),
    },
  });
  if (result.error) {
    return {
      configured: true,
      sent: false,
      error: resendErrorMessage(result.error),
    };
  }
  return { configured: true, sent: true };
}
