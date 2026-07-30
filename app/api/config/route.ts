import { NextResponse } from "next/server";
import { DEFAULT_MODEL_ID } from "@/lib/gemini";

export const runtime = "nodejs";

/** Public config — never returns the actual API key. */
export async function GET() {
  const hasServerKey = Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim(),
  );

  return NextResponse.json({
    hasServerKey,
    defaultModel: DEFAULT_MODEL_ID,
  });
}
