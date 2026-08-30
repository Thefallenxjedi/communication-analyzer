import { clientIp, checkRateLimit } from "@/lib/rate-limit";
import {
  hasSurveyRated,
  submitSurveyRating,
} from "@/lib/surveys";
import { isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json(
      { error: "Survey storage is not configured." },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const rate = checkRateLimit(`survey:${ip}`, 30);
  if (!rate.ok) {
    return Response.json(
      { error: "Too many survey submissions. Try again later." },
      { status: 429 },
    );
  }

  let body: {
    rating?: number;
    comment?: string;
    anonymousId?: string;
    reportSlug?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rating = Math.round(Number(body.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: "Please choose a rating from 1 to 5." },
      { status: 400 },
    );
  }

  const reportSlug = String(body.reportSlug || "")
    .trim()
    .toLowerCase()
    .slice(0, 32);
  const anonymousId = String(body.anonymousId || "").trim().slice(0, 128);
  const comment = String(body.comment || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  if (reportSlug) {
    const already = await hasSurveyRated(reportSlug);
    if (already) {
      return Response.json(
        { ok: true, alreadyRated: true },
        { status: 200 },
      );
    }
  }

  const result = await submitSurveyRating({
    rating,
    comment: comment || undefined,
    anonymousId: anonymousId || undefined,
    reportSlug: reportSlug || undefined,
  });

  if (!result.ok) {
    if (result.reason === "already_rated") {
      return Response.json({ ok: true, alreadyRated: true });
    }
    return Response.json(
      { error: "Could not save your rating. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ rated: false });
  }
  const url = new URL(request.url);
  const reportSlug = String(url.searchParams.get("reportSlug") || "")
    .trim()
    .toLowerCase()
    .slice(0, 32);
  if (!reportSlug) {
    return Response.json({ rated: false });
  }
  const rated = await hasSurveyRated(reportSlug);
  return Response.json({ rated });
}
