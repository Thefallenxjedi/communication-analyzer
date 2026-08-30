/**
 * Estimated Gemini spend for admin. Uses API usage when present;
 * otherwise estimates from clip length. Rates are paid Google AI list prices.
 * Override via env if Google changes pricing.
 */

export type LlmCallUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
};

const FLASH_IN =
  Number(process.env.GEMINI_FLASH_INPUT_PER_MILLION) || 0.75;
const FLASH_OUT =
  Number(process.env.GEMINI_FLASH_OUTPUT_PER_MILLION) || 3.75;
const LITE_IN =
  Number(process.env.GEMINI_LITE_INPUT_PER_MILLION) || 0.3;
const LITE_OUT =
  Number(process.env.GEMINI_LITE_OUTPUT_PER_MILLION) || 2.5;

function ratesForModel(model: string): { input: number; output: number } {
  const id = model.toLowerCase();
  if (id.includes("lite")) return { input: LITE_IN, output: LITE_OUT };
  return { input: FLASH_IN, output: FLASH_OUT };
}

export function usdForCall(call: LlmCallUsage): number {
  const { input, output } = ratesForModel(call.model);
  const inTok = Math.max(0, call.inputTokens);
  const outTok = Math.max(0, call.outputTokens);
  return (inTok / 1_000_000) * input + (outTok / 1_000_000) * output;
}

export function usdForCalls(calls: LlmCallUsage[]): number {
  return calls.reduce((sum, c) => sum + usdForCall(c), 0);
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Pull token counts from AI SDK generateObject result or thrown error. */
export function usageFromUnknown(
  model: string,
  source: unknown,
): LlmCallUsage | null {
  if (!source || typeof source !== "object") return null;
  const root = source as Record<string, unknown>;
  const bag =
    (root.usage as Record<string, unknown> | undefined) ||
    (root.totalUsage as Record<string, unknown> | undefined) ||
    ((root.cause as Record<string, unknown> | undefined)?.usage as
      | Record<string, unknown>
      | undefined);

  if (!bag || typeof bag !== "object") return null;

  const inputTokens =
    num(bag.inputTokens) ||
    num(bag.promptTokens) ||
    num(bag.input_tokens) ||
    0;
  const outputTokens =
    num(bag.outputTokens) ||
    num(bag.completionTokens) ||
    num(bag.output_tokens) ||
    0;
  if (inputTokens <= 0 && outputTokens <= 0) return null;
  return { model, inputTokens, outputTokens };
}

/** ~32 audio tokens/sec is a typical Gemini audio packing rate. */
export function estimateCallFromDuration(
  model: string,
  durationSec: number,
  kind: "transcribe" | "diagnose",
): LlmCallUsage {
  const sec = Math.max(1, Math.round(durationSec));
  const audioIn = sec * 32;
  if (kind === "transcribe") {
    return {
      model,
      inputTokens: audioIn + 400,
      outputTokens: Math.max(80, sec * 12),
    };
  }
  return {
    model,
    inputTokens: audioIn + 2500,
    outputTokens: 4500,
  };
}

export function createSpendTracker() {
  const calls: LlmCallUsage[] = [];
  return {
    record(model: string, source: unknown) {
      const usage = usageFromUnknown(model, source);
      if (usage) calls.push(usage);
      return Boolean(usage);
    },
    recordOrEstimate(
      model: string,
      source: unknown,
      durationSec: number | null,
      kind: "transcribe" | "diagnose",
    ) {
      if (this.record(model, source)) return;
      if (durationSec == null || !Number.isFinite(durationSec) || durationSec <= 0) {
        return;
      }
      calls.push(estimateCallFromDuration(model, durationSec, kind));
    },
    estimateIfEmpty(
      model: string,
      durationSec: number | null,
      kind: "transcribe" | "diagnose",
    ) {
      if (calls.length > 0) return;
      if (durationSec == null || !Number.isFinite(durationSec) || durationSec <= 0) {
        return;
      }
      calls.push(estimateCallFromDuration(model, durationSec, kind));
    },
    snapshot() {
      const inputTokens = calls.reduce((s, c) => s + c.inputTokens, 0);
      const outputTokens = calls.reduce((s, c) => s + c.outputTokens, 0);
      const costUsd = Math.round(usdForCalls(calls) * 1_000_000) / 1_000_000;
      return {
        costUsd,
        inputTokens,
        outputTokens,
        callCount: calls.length,
      };
    },
  };
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return "—";
  if (amount < 0.001) return "<$0.001";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(3)}`;
}
