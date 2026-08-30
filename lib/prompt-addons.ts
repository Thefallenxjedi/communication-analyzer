import {
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
  promptAddOnsApi,
} from "@/lib/convex-server";

export type PromptAddOn = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EnabledPromptAddOn = {
  id: string;
  title: string;
  body: string;
};

export async function listPromptAddOns(): Promise<PromptAddOn[]> {
  if (!isConvexConfigured()) return [];
  const client = getConvexHttpClient();
  if (!client) return [];

  try {
    return (await client.query(promptAddOnsApi.list, {})) as PromptAddOn[];
  } catch (err) {
    console.error("[promptAddOns] list failed", formatConvexError(err), err);
    return [];
  }
}

export async function listEnabledPromptAddOns(): Promise<EnabledPromptAddOn[]> {
  if (!isConvexConfigured()) return [];
  const client = getConvexHttpClient();
  if (!client) return [];

  try {
    return (await client.query(
      promptAddOnsApi.listEnabled,
      {},
    )) as EnabledPromptAddOn[];
  } catch (err) {
    console.error(
      "[promptAddOns] listEnabled failed",
      formatConvexError(err),
      err,
    );
    return [];
  }
}

export function formatPromptAddOnsBlock(
  addOns: EnabledPromptAddOn[],
): string {
  if (!addOns.length) return "";
  const lines = addOns.map(
    (a, i) => `${i + 1}. ${a.title.trim()}: ${a.body.trim()}`,
  );
  return `\n\n---\nADMIN CONTEXT (apply in addition to rules above):\n${lines.join("\n")}\n`;
}

export async function createPromptAddOn(input: {
  title: string;
  body: string;
  enabled?: boolean;
}): Promise<{ ok: boolean; id?: string }> {
  if (!isConvexConfigured()) return { ok: false };
  const client = getConvexHttpClient();
  if (!client) return { ok: false };

  try {
    const result = (await client.mutation(promptAddOnsApi.create, {
      title: input.title,
      body: input.body,
      enabled: input.enabled,
    })) as { ok?: boolean; id?: string };
    return { ok: Boolean(result?.ok), id: result?.id };
  } catch (err) {
    console.error("[promptAddOns] create failed", formatConvexError(err), err);
    return { ok: false };
  }
}

export async function updatePromptAddOn(input: {
  id: string;
  title?: string;
  body?: string;
  enabled?: boolean;
}): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;

  try {
    const result = (await client.mutation(promptAddOnsApi.update, {
      id: input.id as never,
      title: input.title,
      body: input.body,
      enabled: input.enabled,
    })) as { ok?: boolean };
    return Boolean(result?.ok);
  } catch (err) {
    console.error("[promptAddOns] update failed", formatConvexError(err), err);
    return false;
  }
}

export async function setPromptAddOnEnabled(
  id: string,
  enabled: boolean,
): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;

  try {
    const result = (await client.mutation(promptAddOnsApi.setEnabled, {
      id: id as never,
      enabled,
    })) as { ok?: boolean };
    return Boolean(result?.ok);
  } catch (err) {
    console.error(
      "[promptAddOns] setEnabled failed",
      formatConvexError(err),
      err,
    );
    return false;
  }
}

export async function removePromptAddOn(id: string): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const client = getConvexHttpClient();
  if (!client) return false;

  try {
    const result = (await client.mutation(promptAddOnsApi.remove, {
      id: id as never,
    })) as { ok?: boolean };
    return Boolean(result?.ok);
  } catch (err) {
    console.error("[promptAddOns] remove failed", formatConvexError(err), err);
    return false;
  }
}
