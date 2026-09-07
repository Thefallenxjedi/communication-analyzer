import { Resend } from "resend";
import { isSampleClientEmail } from "@/lib/sample-client";

const DEFAULT_FROM = "EliteSpeak <hello@elitespeakprogram.com>";
const DEFAULT_TEMPLATE = "Welcome_email";
const DEFAULT_SEGMENT_NAME = "user_registered";

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

type SegmentRow = {
  id?: string;
  name?: string;
};

let cachedSegmentId: string | null = null;

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function firstNameFrom(name: string): string {
  const first = name.trim().split(/\s+/)[0] || "";
  return first || "there";
}

function lastNameFrom(name: string): string | undefined {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return undefined;
  return parts.slice(1).join(" ");
}

export function clientJoinUrl(): string {
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

function alreadyExists(error: unknown): boolean {
  const message = resendErrorMessage(error).toLowerCase();
  return (
    message.includes("already exists") ||
    message.includes("already been taken") ||
    message.includes("duplicate")
  );
}

function welcomeHtml(firstName: string, joinUrl: string): string {
  const name = firstName.replace(/</g, "");
  const url = joinUrl.replace(/"/g, "");
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#141210;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141210;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
            <tr>
              <td style="padding:0 8px 20px 8px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a968;">
                EliteSpeak
              </td>
            </tr>
            <tr>
              <td style="background:#1c1912;border:1px solid #3a3428;border-radius:16px;padding:36px 32px 32px 32px;">
                <p style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;color:#ede4cc;margin:0 0 14px 0;">
                  ${name}, your Verbal Workout is open.
                </p>
                <p style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#b3a98d;margin:0 0 22px 0;">
                  Your coach has added you to the EliteSpeak client platform.
                  This is your private space for sessions, practice, and review.
                </p>
                <p style="margin:0 0 28px 0;">
                  <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#141210;background:#c9a968;border-radius:999px;text-decoration:none;">
                    Join your program
                  </a>
                </p>
                <p style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#b3a98d;margin:0;">
                  Use the same Google account your coach has on file.
                  You do not need an account yet — open the link and sign in when you are ready.
                </p>
                <p style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8d836c;margin:16px 0 0 0;">
                  If the button does not open, paste this address into your browser:<br />
                  <a href="${url}" style="color:#c9a968;text-decoration:underline;">${url}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function resolveSegmentId(resend: Resend): Promise<string | null> {
  const fromEnv = env("RESEND_SEGMENT_ID");
  if (fromEnv) return fromEnv;
  if (cachedSegmentId) return cachedSegmentId;

  const wanted = (env("RESEND_SEGMENT_NAME") || DEFAULT_SEGMENT_NAME)
    .trim()
    .toLowerCase();
  const list = resend.segments?.list;
  if (typeof list !== "function") return null;

  const { data, error } = await list.call(resend.segments);
  if (error) throw new Error(resendErrorMessage(error));

  const rows = ((data as { data?: SegmentRow[] } | null)?.data ||
    []) as SegmentRow[];
  const match = rows.find((row) => {
    const name = (row.name || "").trim().toLowerCase();
    return name === wanted || name.replace(/\s+/g, "_") === wanted;
  });
  if (!match?.id) return null;
  cachedSegmentId = match.id;
  return match.id;
}

async function enrollContact(
  resend: Resend,
  input: { email: string; firstName: string; lastName?: string },
): Promise<boolean> {
  const created = await resend.contacts.create({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    unsubscribed: false,
  });

  if (created.error && !alreadyExists(created.error)) {
    throw new Error(resendErrorMessage(created.error));
  }

  const segmentId = await resolveSegmentId(resend);
  if (!segmentId) {
    throw new Error(
      `Resend segment "${env("RESEND_SEGMENT_NAME") || DEFAULT_SEGMENT_NAME}" was not found.`,
    );
  }

  const add = resend.contacts.segments?.add;
  if (typeof add !== "function") {
    throw new Error("Resend contacts.segments.add is not available.");
  }

  const added = await add.call(resend.contacts.segments, {
    email: input.email,
    segmentId,
  });
  if (added.error && !alreadyExists(added.error)) {
    throw new Error(resendErrorMessage(added.error));
  }
  return true;
}

async function sendWelcomeEmail(
  resend: Resend,
  input: { email: string; firstName: string },
): Promise<void> {
  const from = env("RESEND_FROM") || DEFAULT_FROM;
  const joinUrl = clientJoinUrl();
  const subject = `${input.firstName}, your Verbal Workout is open.`;
  const html = welcomeHtml(input.firstName, joinUrl);

  try {
    const sent = await resend.emails.send({
      from,
      to: input.email,
      template: {
        id: env("RESEND_WELCOME_TEMPLATE") || DEFAULT_TEMPLATE,
        variables: {
          CLIENT_NAME: input.firstName,
          JOIN_URL: joinUrl,
        },
      },
    } as never);
    if (!sent.error) return;
    console.warn("[resend] template send failed, using HTML", sent.error);
  } catch (err) {
    console.warn("[resend] template send failed, using HTML", err);
  }

  const fallback = await resend.emails.send({
    from,
    to: input.email,
    subject,
    html,
  });
  if (fallback.error) {
    throw new Error(resendErrorMessage(fallback.error));
  }
}

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
      error: "Name and email are required to send the welcome email.",
    };
  }
  if (isSampleClientEmail(email)) {
    return { configured: isResendConfigured(), sent: false, enrolled: false };
  }

  const resend = getResend();
  if (!resend) {
    return { configured: false, sent: false, enrolled: false };
  }

  const firstName = firstNameFrom(name);
  const lastName = lastNameFrom(name);
  let sent = false;
  let enrolled = false;
  const errors: string[] = [];

  try {
    await sendWelcomeEmail(resend, { email, firstName });
    sent = true;
  } catch (err) {
    errors.push(resendErrorMessage(err));
  }

  try {
    enrolled = await enrollContact(resend, { email, firstName, lastName });
  } catch (err) {
    errors.push(resendErrorMessage(err));
  }

  return {
    configured: true,
    sent,
    enrolled,
    error: sent ? undefined : errors[0],
  };
}
