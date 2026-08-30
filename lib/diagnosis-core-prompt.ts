import { DIAGNOSIS_PROMPT } from "@/lib/gemini";
import {
  diagnosisCorePromptApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";

export type DiagnosisCorePromptState = {
  /** Effective text shown/edited in admin (override or code default). */
  body: string;
  isOverride: boolean;
  updatedAt: string | null;
  /** Immutable code default for reset. */
  codeDefault: string;
};

export async function getDiagnosisCorePromptState(): Promise<DiagnosisCorePromptState> {
  const codeDefault = DIAGNOSIS_PROMPT;
  if (!isConvexConfigured()) {
    return {
      body: codeDefault,
      isOverride: false,
      updatedAt: null,
      codeDefault,
    };
  }
  const client = getConvexHttpClient();
  if (!client) {
    return {
      body: codeDefault,
      isOverride: false,
      updatedAt: null,
      codeDefault,
    };
  }

  try {
    const row = (await client.query(diagnosisCorePromptApi.get, {})) as {
      body: string | null;
      isOverride: boolean;
      updatedAt: string | null;
    };
    if (row?.isOverride && row.body?.trim()) {
      return {
        body: row.body,
        isOverride: true,
        updatedAt: row.updatedAt,
        codeDefault,
      };
    }
  } catch (err) {
    console.error(
      "[diagnosisCorePrompt] get failed",
      formatConvexError(err),
      err,
    );
  }

  return {
    body: codeDefault,
    isOverride: false,
    updatedAt: null,
    codeDefault,
  };
}

/** Prompt text used at analyze time (override if set, else code). */
export async function resolveDiagnosisCorePrompt(): Promise<string> {
  const state = await getDiagnosisCorePromptState();
  return state.body.trim() || DIAGNOSIS_PROMPT;
}

export async function saveDiagnosisCorePrompt(
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isConvexConfigured()) return { ok: false, error: "Convex not configured" };
  const client = getConvexHttpClient();
  if (!client) return { ok: false, error: "Convex not configured" };

  try {
    await client.mutation(diagnosisCorePromptApi.set, { body });
    return { ok: true };
  } catch (err) {
    console.error(
      "[diagnosisCorePrompt] set failed",
      formatConvexError(err),
      err,
    );
    return { ok: false, error: formatConvexError(err) };
  }
}

export async function resetDiagnosisCorePrompt(): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;

  try {
    await client.mutation(diagnosisCorePromptApi.clear, {});
    return true;
  } catch (err) {
    console.error(
      "[diagnosisCorePrompt] clear failed",
      formatConvexError(err),
      err,
    );
    return false;
  }
}
