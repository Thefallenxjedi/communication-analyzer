import type { DiagnosisReport } from "@/lib/schema";
import { absoluteReportUrl } from "@/lib/shared-reports";

const KARTRA_API_URL = "https://app.kartra.com/api";

function env(name: string): string {
  return (process.env[name] || "").trim();
}

export function isKartraConfigured(): boolean {
  return Boolean(
    env("KARTRA_APP_ID") &&
      env("KARTRA_API_KEY") &&
      env("KARTRA_API_PASSWORD"),
  );
}

function listName(): string {
  return env("KARTRA_LIST_NAME");
}

/** Custom field identifiers (must match Kartra). Override via env if needed. */
function fieldIds() {
  return {
    overallScore: env("KARTRA_FIELD_OVERALL_SCORE") || "overall_score",
    level: env("KARTRA_FIELD_LEVEL") || "level",
    mainFocus: env("KARTRA_FIELD_MAIN_FOCUS") || "main_focus",
    whatWentWell: env("KARTRA_FIELD_WHAT_WENT_WELL") || "what_went_well",
    whatToImprove: env("KARTRA_FIELD_WHAT_TO_IMPROVE") || "what_to_improve",
    /** Full report URL, e.g. https://app.elitespeakprogram.com/r/abc123 */
    reportLink: env("KARTRA_FIELD_REPORT_LINK") || "assessment_link",
  };
}

type KartraResult = {
  ok: boolean;
  status?: string;
  message?: string;
  type?: string;
  alreadyExists?: boolean;
  raw?: unknown;
};

function flattenKartraBody(
  lead: Record<string, unknown>,
  actions: Record<string, unknown>[],
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("app_id", env("KARTRA_APP_ID"));
  params.set("api_key", env("KARTRA_API_KEY"));
  params.set("api_password", env("KARTRA_API_PASSWORD"));

  for (const [key, value] of Object.entries(lead)) {
    if (key === "custom_fields" && Array.isArray(value)) {
      value.forEach((field, i) => {
        const f = field as { field_identifier?: string; field_value?: string };
        if (!f?.field_identifier) return;
        params.set(
          `lead[custom_fields][${i}][field_identifier]`,
          f.field_identifier,
        );
        params.set(
          `lead[custom_fields][${i}][field_value]`,
          String(f.field_value ?? ""),
        );
      });
      continue;
    }
    if (value == null) continue;
    params.set(`lead[${key}]`, String(value));
  }

  actions.forEach((action, i) => {
    for (const [key, value] of Object.entries(action)) {
      if (value == null) continue;
      params.set(`actions[${i}][${key}]`, String(value));
    }
  });

  return params;
}

function isAlreadyExistsError(result: KartraResult): boolean {
  const msg = String(result.message || "").toLowerCase();
  const type = String(result.type || "");
  return type === "244" || msg.includes("already exists");
}

async function kartraRequest(
  lead: Record<string, unknown>,
  actions: Record<string, unknown>[],
): Promise<KartraResult> {
  if (!isKartraConfigured()) {
    return { ok: false, message: "Kartra is not configured" };
  }

  try {
    const res = await fetch(KARTRA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: flattenKartraBody(lead, actions).toString(),
    });

    const text = await res.text();
    let json: {
      status?: string;
      message?: string;
      type?: string | number;
    } = {};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      return {
        ok: false,
        message: `Kartra non-JSON response (${res.status})`,
        raw: text.slice(0, 400),
      };
    }

    const status = String(json.status || "");
    const ok =
      res.ok &&
      status.toLowerCase() !== "error" &&
      status.toLowerCase() !== "fail";

    return {
      ok,
      status: json.status,
      message: json.message,
      type: json.type != null ? String(json.type) : undefined,
      raw: json,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Kartra request failed",
    };
  }
}

async function subscribeToList(email: string): Promise<KartraResult> {
  const list = listName();
  if (!list) {
    return { ok: true, message: "No KARTRA_LIST_NAME — skip subscribe" };
  }
  return kartraRequest({ email }, [
    { cmd: "subscribe_lead_to_list", list_name: list },
  ]);
}

/**
 * Upsert lead into Kartra. Optionally subscribe to list.
 * create_lead fails with type 244 when email already exists — treat as OK and edit.
 */
export async function createKartraLead(input: {
  firstName: string;
  email: string;
  lastName?: string;
  /** Default true. Set false when writing custom fields first, then subscribe. */
  subscribe?: boolean;
}): Promise<KartraResult> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim().slice(0, 80);
  if (!email || !firstName) {
    return { ok: false, message: "firstName and email required" };
  }

  const lead: Record<string, unknown> = {
    email,
    first_name: firstName,
  };
  if (input.lastName?.trim()) {
    lead.last_name = input.lastName.trim().slice(0, 80);
  }

  const created = await kartraRequest(lead, [{ cmd: "create_lead" }]);
  let alreadyExists = false;

  if (!created.ok) {
    if (isAlreadyExistsError(created)) {
      alreadyExists = true;
      const edited = await kartraRequest(lead, [{ cmd: "edit_lead" }]);
      if (!edited.ok) {
        console.error(
          "[kartra] edit_lead after exists failed",
          edited.message,
          edited.raw,
        );
      }
    } else {
      console.error("[kartra] create_lead failed", created.message, created.raw);
      return created;
    }
  }

  if (input.subscribe === false) {
    return {
      ok: true,
      alreadyExists,
      message: alreadyExists ? "Lead already existed — updated" : "Lead created",
    };
  }

  const subscribed = await subscribeToList(email);
  if (!subscribed.ok) {
    console.error(
      "[kartra] subscribe_lead_to_list failed",
      subscribed.message,
      subscribed.raw,
    );
    return {
      ok: true,
      alreadyExists,
      message: `Lead saved; list subscribe failed: ${subscribed.message || "unknown"}`,
      raw: subscribed.raw,
    };
  }

  return {
    ok: true,
    alreadyExists,
    message: alreadyExists
      ? "Lead already existed — updated + subscribed"
      : "Lead created",
  };
}

function scoreBand(score: number): string {
  if (score < 50) return "score_low";
  if (score < 70) return "score_mid";
  return "score_high";
}

function buildReportCustomFields(
  report: DiagnosisReport,
  reportUrl?: string,
) {
  const ids = fieldIds();
  const overall = Math.round(report.overallScore);
  const strengths = (report.mainChallenge.strengths || "").trim().slice(0, 1900);
  const improvements = (report.mainChallenge.improvements || "")
    .trim()
    .slice(0, 1900);

  const custom_fields: { field_identifier: string; field_value: string }[] = [
    {
      field_identifier: ids.overallScore,
      field_value: String(overall),
    },
    {
      field_identifier: ids.level,
      field_value: (report.level || "").slice(0, 200),
    },
    {
      field_identifier: ids.mainFocus,
      field_value: (report.mainChallenge.title || "").slice(0, 200),
    },
    {
      field_identifier: ids.whatWentWell,
      field_value: strengths || "—",
    },
    {
      field_identifier: ids.whatToImprove,
      field_value: improvements || "—",
    },
  ];

  const link = (reportUrl || "").trim();
  if (link) {
    custom_fields.push({
      field_identifier: ids.reportLink,
      field_value: link.slice(0, 500),
    });
  }

  return { overall, custom_fields };
}

/**
 * After diagnosis: create/update lead → write custom fields → subscribe last
 * so list-triggered emails already have score data.
 */
export async function syncReportToKartra(input: {
  email: string;
  firstName: string;
  report: DiagnosisReport;
  /** Share slug (`abc123`) or full URL. Written to Kartra `assessment_link`. */
  reportUrl?: string;
  shareSlug?: string;
}): Promise<KartraResult> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim().slice(0, 80) || "Friend";
  if (!email) return { ok: false, message: "email required" };

  const upsert = await createKartraLead({
    firstName,
    email,
    subscribe: false,
  });
  if (!upsert.ok) return upsert;

  const reportUrl =
    input.reportUrl?.trim() ||
    (input.shareSlug ? absoluteReportUrl(input.shareSlug) : undefined);

  const { overall, custom_fields } = buildReportCustomFields(
    input.report,
    reportUrl,
  );
  const actions: Record<string, unknown>[] = [{ cmd: "edit_lead" }];
  if (env("KARTRA_ASSIGN_SCORE_TAGS") === "true") {
    actions.push({ cmd: "assign_tag", tag_name: scoreBand(overall) });
  }

  const edited = await kartraRequest(
    {
      email,
      first_name: firstName,
      custom_fields,
    },
    actions,
  );

  if (!edited.ok) {
    console.error("[kartra] edit_lead (report) failed", edited.message, edited.raw);
    return edited;
  }

  const subscribed = await subscribeToList(email);
  if (!subscribed.ok) {
    console.error(
      "[kartra] subscribe after report failed",
      subscribed.message,
      subscribed.raw,
    );
    return {
      ok: true,
      message: `Fields saved; list subscribe failed: ${subscribed.message || "unknown"}`,
      raw: subscribed.raw,
    };
  }

  console.info("[kartra] syncReportToKartra ok", { email, overall });
  return { ok: true, message: "Lead + fields + list synced" };
}

/** @deprecated Prefer syncReportToKartra after diagnosis. */
export async function updateKartraLeadFromReport(input: {
  email: string;
  report: DiagnosisReport;
  firstName?: string;
}): Promise<KartraResult> {
  return syncReportToKartra({
    email: input.email,
    firstName: input.firstName || "Friend",
    report: input.report,
  });
}
