import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/email";

/**
 * Demo / noop lead endpoint — does not persist.
 * Validates name + real email (blocks disposable / garbage).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const emailCheck = validateEmail(
      typeof body.email === "string" ? body.email : "",
    );

    if (!name || !emailCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: !name
            ? "Invalid name or email."
            : emailCheck.ok
              ? "Invalid name or email."
              : emailCheck.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }
}
