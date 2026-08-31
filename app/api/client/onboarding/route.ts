import {
  getCoachingClientByEmail,
  getCoachingStorageUrl,
  saveClientOnboarding,
} from "@/lib/coaching-clients";
import { readClientEmailFromCookie } from "@/lib/client-session";
import { formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import { profileFromLinkedInPdf } from "@/lib/linkedin-profile";
import { pdfToText } from "@/lib/pdf-text";

export const runtime = "nodejs";
export const maxDuration = 120;

const PDF_MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const email = readClientEmailFromCookie(request);
  if (!email) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { storageId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const storageId = body.storageId?.trim() || "";
  if (!storageId) {
    return Response.json({ error: "Upload your LinkedIn PDF." }, { status: 400 });
  }

  try {
    const row = await getCoachingClientByEmail(email);
    if (!row) {
      return Response.json({ error: "Not enrolled." }, { status: 401 });
    }
    if (row.onboardingComplete) {
      return Response.json({ error: "LinkedIn is already submitted." }, { status: 400 });
    }

    const fileUrl = await getCoachingStorageUrl(storageId);
    if (!fileUrl) {
      return Response.json({ error: "Could not read the uploaded PDF." }, { status: 400 });
    }
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return Response.json({ error: "Could not download the PDF." }, { status: 400 });
    }
    const buffer = new Uint8Array(await fileRes.arrayBuffer());
    if (buffer.byteLength > PDF_MAX_BYTES) {
      return Response.json({ error: "PDF must be under 8 MB." }, { status: 400 });
    }

    const text = await pdfToText(buffer);
    const profile = await profileFromLinkedInPdf({
      bytes: buffer,
      text,
      name: row.name,
      role: row.onboardingRole || "",
      company: row.onboardingCompany || "",
      goal: row.onboardingGoal || "",
    });

    const saved = await saveClientOnboarding({
      clientId: row.id,
      linkedinStorageId: storageId,
      linkedinText: text,
      linkedinProfileJson: JSON.stringify(profile),
    });
    if (!saved.ok) {
      return Response.json(
        { error: saved.error || "Could not save LinkedIn profile." },
        { status: 400 },
      );
    }
    return Response.json({ ok: true, profile });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
