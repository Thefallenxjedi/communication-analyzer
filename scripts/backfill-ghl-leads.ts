import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { syncFreeToolContact } from "../lib/gohighlevel";

function loadEnvFile(path: string) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "").trim();
    if (value) process.env[match[1]] = value;
  }
}

type Lead = { email: string; firstName: string };

function loadPreviousLeads(): Lead[] {
  const source = `
    const rows = await ctx.db.query("analyses").withIndex("by_createdAt").order("desc").take(8000);
    const byEmail = new Map();
    for (const row of rows) {
      const email = String(row.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) continue;
      const firstName = String(row.firstName || "").trim();
      const current = byEmail.get(email);
      if (!current) byEmail.set(email, { email, firstName });
      else if (!current.firstName && firstName) current.firstName = firstName;
    }
    return Array.from(byEmail.values());
  `;
  const stdout = execFileSync(
    "npx",
    ["convex", "run", "--prod", "--inline-query", source],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as Lead[];
  if (!Array.isArray(parsed)) {
    throw new Error("Could not read previous leads.");
  }
  return parsed;
}

async function main() {
  if (process.env.BACKFILL_ENV) loadEnvFile(process.env.BACKFILL_ENV);
  const leads = loadPreviousLeads();
  let sent = 0;
  let created = 0;
  let updated = 0;
  const failed: string[] = [];

  for (const lead of leads) {
    const result = await syncFreeToolContact({
      name: lead.firstName,
      email: lead.email,
    });
    if (result.ok) {
      sent += 1;
      if (result.created) created += 1;
      else updated += 1;
    } else {
      failed.push(`${lead.email} (${result.reason})`);
      if (/401|403|Invalid token|not_configured/i.test(result.reason)) {
        console.error("Stopping: GoHighLevel rejected the credentials.");
        break;
      }
    }
    const done = sent + failed.length;
    if (done % 25 === 0) {
      console.error(`progress ${done}/${leads.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(
    JSON.stringify(
      {
        leads: leads.length,
        sent,
        created,
        updated,
        failed: failed.length,
        failures: failed,
      },
      null,
      2,
    ),
  );
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "Backfill failed");
  process.exit(1);
});
