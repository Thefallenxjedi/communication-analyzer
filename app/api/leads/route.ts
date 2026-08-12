import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/email";
import { attachLeadToAnalysis } from "@/lib/analyses";
import { isConvexConfigured } from "@/lib/convex-server";

export const runtime = "nodejs";

/**
 * Lead capture — homepage opt-in or PDF gate.
 * Saves to Convex/admin only. Kartra is synced after the report is ready.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      firstName?: string;
      email?: string;
      anonymousId?: string;
      source?: string;
    };

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const first = firstName.split(/\s+/)[0] || firstName;
    const anonymousId =
      typeof body.anonymousId === "string" ? body.anonymousId.trim() : "";
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 64)
        : "homepage";
    const emailCheck = validateEmail(
      typeof body.email === "string" ? body.email : "",
    );

    if (!first) {
      return NextResponse.json(
        { ok: false, error: "Enter your first name." },
        { status: 400 },
      );
    }
    if (!emailCheck.ok) {
      return NextResponse.json(
        { ok: false, error: emailCheck.error },
        { status: 400 },
      );
    }
    if (!anonymousId) {
      return NextResponse.json(
        { ok: false, error: "Missing session id. Refresh and try again." },
        { status: 400 },
      );
    }

    if (!isConvexConfigured()) {
      // Still allow funnel via sessionStorage when Convex isn't set locally
      console.warn("[leads] Convex not configured — client session only");
      return NextResponse.json({
        ok: true,
        firstName: first,
        email: emailCheck.email,
        source,
        convex: false,
        kartra: false,
      });
    }

    const convexOk = await attachLeadToAnalysis({
      anonymousId,
      firstName: first,
      email: emailCheck.email,
      source,
    });

    if (!convexOk) {
      console.error("[leads] Convex attach failed", { anonymousId, source });
      return NextResponse.json(
        { ok: false, error: "Could not save your details. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      firstName: first,
      email: emailCheck.email,
      source,
      convex: true,
      kartra: false,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }
}
