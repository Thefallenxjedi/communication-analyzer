import { after, NextResponse } from "next/server";
import { validateEmail } from "@/lib/email";
import { attachLeadToAnalysis } from "@/lib/analyses";
import { isConvexConfigured } from "@/lib/convex-server";
import { isGoHighLevelConfigured, syncFreeToolContact } from "@/lib/gohighlevel";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Lead capture — homepage opt-in or PDF gate.
 * The lead is always saved. GoHighLevel receives name, email, and the
 * Communication_tool tag only when GHL_ACCESS_TOKEN and GHL_LOCATION_ID
 * are set. Kartra is synced once after the report from /api/analyze
 * and /api/kartra-sync.
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

    let convexOk = false;
    if (isConvexConfigured()) {
      convexOk = await attachLeadToAnalysis({
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
    } else {
      console.warn("[leads] Convex not configured — client session only");
    }

    if (isGoHighLevelConfigured()) {
      const ip = clientIp(request);
      const leadName = first;
      const leadEmail = emailCheck.email;
      after(async () => {
        const limit = checkRateLimit(`ghl-lead:${ip}`, 20);
        if (!limit.ok) {
          console.error("[ghl] free-tool sync rate limited");
          return;
        }
        try {
          const synced = await syncFreeToolContact({
            name: leadName,
            email: leadEmail,
          });
          if (!synced.ok) {
            console.error("[ghl] free-tool sync did not succeed", {
              reason: synced.reason,
            });
          }
        } catch (err) {
          console.error("[ghl] free-tool sync crashed", {
            message: err instanceof Error ? err.message : "error",
          });
        }
      });
    }

    return NextResponse.json({
      ok: true,
      firstName: first,
      email: emailCheck.email,
      source,
      convex: convexOk,
      kartra: false,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }
}
