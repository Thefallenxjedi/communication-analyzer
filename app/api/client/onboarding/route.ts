import { getActiveClientSession } from "@/lib/client-auth";
import {
  getCoachingStorageUrl,
  saveClientOnboarding,
} from "@/lib/coaching-clients";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import {
  profileFromLinkedInPdf,
  profileFromLinkedInText,
} from "@/lib/linkedin-profile";
import { pdfToText } from "@/lib/pdf-text";

export const runtime = "nodejs";
export const maxDuration = 120;

const PDF_MAX_BYTES = 8 * 1024 * 1024;
const SOCIAL_PROFILE_COUNT_MAX = 8;
const SOCIAL_PROFILE_MAX = 200;

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const active = await getActiveClientSession();
  if (!active) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const row = active.client;

  let body: {
    storageId?: string;
    profileText?: string;
    socialProfiles?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const storageId = body.storageId?.trim() || "";
  const profileText = body.profileText?.trim() || "";
  const socialProfiles = (Array.isArray(body.socialProfiles)
    ? body.socialProfiles
    : []
  )
    .map((value) =>
      typeof value === "string"
        ? value.replace(/\s+/g, " ").trim().slice(0, SOCIAL_PROFILE_MAX)
        : "",
    )
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, SOCIAL_PROFILE_COUNT_MAX);
  if (!storageId && !profileText && socialProfiles.length === 0) {
    return Response.json(
      { error: "Add a social profile, upload a LinkedIn PDF, or paste profile text." },
      { status: 400 },
    );
  }

  try {
    if (row.onboardingComplete && !storageId && !profileText) {
      const saved = await saveClientOnboarding({
        clientId: row.id,
        socialProfiles,
      });
      if (!saved.ok) {
        return Response.json(
          { error: saved.error || "Could not save profiles." },
          { status: 400 },
        );
      }
      return Response.json({ ok: true });
    }

    let text =
      profileText ||
      `Social profiles:\n${socialProfiles.map((value) => `- ${value}`).join("\n")}`;
    let profile;

    if (storageId) {
      const fileUrl = await getCoachingStorageUrl(storageId);
      if (!fileUrl) {
        return Response.json(
          { error: "Could not read the uploaded PDF." },
          { status: 400 },
        );
      }
      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) {
        return Response.json(
          { error: "Could not download the PDF." },
          { status: 400 },
        );
      }
      const buffer = new Uint8Array(await fileRes.arrayBuffer());
      if (buffer.byteLength > PDF_MAX_BYTES) {
        return Response.json({ error: "PDF must be under 8 MB." }, { status: 400 });
      }

      text = await pdfToText(buffer);
      profile = await profileFromLinkedInPdf({
        bytes: buffer,
        text,
        name: row.name,
        role: row.onboardingRole || "",
        company: row.onboardingCompany || "",
        goal: row.onboardingGoal || "",
      });
    } else {
      profile = await profileFromLinkedInText({
        text,
        name: row.name,
        role: row.onboardingRole || "",
        company: row.onboardingCompany || "",
        goal: row.onboardingGoal || "",
      });
    }

    const saved = await saveClientOnboarding({
      clientId: row.id,
      linkedinStorageId: storageId || undefined,
      linkedinText: text,
      linkedinProfileJson: JSON.stringify(profile),
      socialProfiles,
    });
    if (!saved.ok) {
      return Response.json(
        { error: saved.error || "Could not save profiles." },
        { status: 400 },
      );
    }
    return Response.json({ ok: true, profile });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
