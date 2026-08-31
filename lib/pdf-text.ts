import { extractText } from "unpdf";

const TEXT_MAX = 80_000;

/** Extract readable text from a PDF. LinkedIn exports are usually text-based. */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  try {
    const result = await extractText(bytes, { mergePages: true });
    const raw = result.text;
    return raw.replace(/\u0000/g, "").replace(/\s+\n/g, "\n").trim().slice(0, TEXT_MAX);
  } catch (err) {
    console.error("[pdf] extract failed", err);
    return "";
  }
}
