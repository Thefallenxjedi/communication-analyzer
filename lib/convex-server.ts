import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

/** Prefer server-only URL; fall back to public (works on Vercel either way). */
export function getConvexUrl(): string {
  const raw =
    process.env.CONVEX_URL?.trim() ||
    process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ||
    "";
  return raw.replace(/^["']|["']$/g, "").replace(/\/$/, "");
}

export function isConvexConfigured(): boolean {
  return Boolean(getConvexUrl());
}

export function getConvexHttpClient(): ConvexHttpClient | null {
  const url = getConvexUrl();
  if (!url) return null;
  if (!/^https:\/\/[a-z0-9-]+\.convex\.cloud$/i.test(url)) {
    console.error("[convex] unexpected URL shape:", url);
  }
  return new ConvexHttpClient(url);
}

export const analysesApi = {
  insert: makeFunctionReference<"mutation">("analyses:insert"),
  attachLead: makeFunctionReference<"mutation">("analyses:attachLead"),
  listRecent: makeFunctionReference<"query">("analyses:listRecent"),
  getStats: makeFunctionReference<"query">("analyses:getStats"),
};

export function formatConvexError(err: unknown): string {
  if (err == null) return "Unknown Convex error";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const extra =
      "data" in err && (err as { data?: unknown }).data != null
        ? ` ${JSON.stringify((err as { data?: unknown }).data)}`
        : "";
    return `${err.message || err.name || "Error"}${extra}`.trim();
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
