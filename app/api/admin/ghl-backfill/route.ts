import { isGoHighLevelConfigured, syncFreeToolContact } from "@/lib/gohighlevel";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * One-time backfill for leads already stored. Requires GHL_BACKFILL_TOKEN.
 * Sends only name, email, and the Communication_tool tag.
 */
export async function POST(request: Request) {
  const expected = process.env.GHL_BACKFILL_TOKEN?.trim() ?? "";
  const header = request.headers.get("authorization") ?? "";
  if (!expected || header !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isGoHighLevelConfigured()) {
    return Response.json({ error: "GoHighLevel is not configured." }, { status: 503 });
  }

  let body: { leads?: { email?: unknown; firstName?: unknown }[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const leads = Array.isArray(body.leads) ? body.leads.slice(0, 20) : [];
  let sent = 0;
  let created = 0;
  let updated = 0;
  const failed: string[] = [];

  for (const lead of leads) {
    const email = typeof lead.email === "string" ? lead.email : "";
    const name = typeof lead.firstName === "string" ? lead.firstName : "";
    const result = await syncFreeToolContact({ name, email });
    if (result.ok) {
      sent += 1;
      if (result.created) created += 1;
      else updated += 1;
      continue;
    }
    failed.push(result.reason);
    if (/401|403|not_configured/i.test(result.reason)) break;
  }

  return Response.json({
    received: leads.length,
    sent,
    created,
    updated,
    failed,
  });
}
