export type EliteSpeakClientInviteProps = {
  firstName: string;
  joinUrl: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The single source of truth for the client portal / Verbal Workout invite.
 * Edit this file to change both the HTML and plain-text versions.
 */
export function renderEliteSpeakClientInvite({
  firstName,
  joinUrl,
}: EliteSpeakClientInviteProps): RenderedEmail {
  const name = escapeHtml(firstName.trim() || "there");
  const url = escapeHtml(joinUrl);
  const subject = `${firstName.trim() || "There"}, your Verbal Workout is open.`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>EliteSpeak Client Portal is ready</title>
  </head>
  <body style="margin:0;padding:0;background:#141210;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your EliteSpeak Client Portal is ready. Open your Verbal Workout.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141210;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
            <tr>
              <td style="padding:0 8px 20px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a968;">
                EliteSpeak
              </td>
            </tr>
            <tr>
              <td style="background:#1c1912;border:1px solid #3a3428;border-radius:16px;padding:36px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:0 0 18px;">
                      <span style="display:inline-block;width:10px;height:10px;border:2px solid #c9a968;border-radius:999px;"></span>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;color:#ede4cc;padding:0 0 14px;">
                      ${name}, your Verbal Workout is open.
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#b3a98d;padding:0 0 22px;">
                      Your EliteSpeak Client Portal is ready. This is your private space for sessions, practice, and review.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 28px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background:#c9a968;border-radius:999px;">
                            <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#141210;text-decoration:none;">
                              Join your program
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #3a3428;padding:22px 0 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#b3a98d;">
                      Use the same Google account your coach has on file. After you sign in, you will land in your client workspace.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8d836c;">
                      If the button does not open, paste this address into your browser:<br />
                      <a href="${url}" style="color:#c9a968;text-decoration:underline;">${url}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8d836c;">
                EliteSpeak · Private coaching clients only<br />
                You received this because your coach added you to the program.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${firstName.trim() || "Hi"}, your Verbal Workout is open.

Your EliteSpeak Client Portal is ready. This is your private space for sessions, practice, and review.

Join your program:
${joinUrl}

Use the same Google account your coach has on file. After you sign in, you will land in your client workspace.

EliteSpeak · Private coaching clients only`;

  return { subject, html, text };
}
