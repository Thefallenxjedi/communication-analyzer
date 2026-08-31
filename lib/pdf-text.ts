import { extractText } from "unpdf";

const TEXT_MAX = 80_000;

const HEADING =
  /^(contact|top skills|skills|languages|certifications?|licenses?(?: & certifications)?|summary|about|experience|education|volunteer(?: experience)?|honors(?: & awards)?|awards|publications?|projects?|organizations?|courses?|patents?|recommendations?)$/i;

const JUNK =
  /^(page\s+\d+(\s+of\s+\d+)?|linkedin|confidential|www\.linkedin\.com.*)$/i;

export type PdfTextBlock = {
  heading: string;
  paragraphs: string[];
};

/** Extract readable text from a PDF. LinkedIn exports are usually text-based. */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  try {
    const result = await extractText(bytes, { mergePages: true });
    return cleanPdfExtract(result.text).slice(0, TEXT_MAX);
  } catch (err) {
    console.error("[pdf] extract failed", err);
    return "";
  }
}

export function cleanPdfExtract(raw: string): string {
  const lines = normalizeLines(raw);
  return wrapLines(lines).join("\n").trim();
}

/** Turn messy LinkedIn PDF extract into headed paragraphs for admin reading. */
export function formatLinkedInPdfText(raw: string): PdfTextBlock[] {
  const lines = wrapLines(normalizeLines(raw));
  if (!lines.length) return [];

  const blocks: PdfTextBlock[] = [];
  let heading = "Profile";
  let bucket: string[] = [];

  const flush = () => {
    const paragraphs = toParagraphs(bucket);
    if (paragraphs.length) blocks.push({ heading, paragraphs });
    bucket = [];
  };

  for (const line of lines) {
    const key = line.replace(/[:.]+$/, "").trim();
    if (HEADING.test(key) && key.length < 48) {
      flush();
      heading = titleCaseHeading(key);
      continue;
    }
    bucket.push(line);
  }
  flush();
  return blocks;
}

function normalizeLines(raw: string): string[] {
  const lines: string[] = [];
  for (const part of raw
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .split("\n")) {
    const line = part.replace(/[ \t]+/g, " ").trim();
    if (!line || JUNK.test(line)) continue;
    if (lines[lines.length - 1]?.toLowerCase() === line.toLowerCase()) continue;
    lines.push(line);
  }
  return lines;
}

function wrapLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (prev && shouldJoin(prev, line)) {
      out[out.length - 1] = prev.replace(/-$/, "") + (prev.endsWith("-") ? "" : " ") + line;
      continue;
    }
    out.push(line);
  }
  return out;
}

function shouldJoin(prev: string, next: string): boolean {
  if (HEADING.test(next.replace(/[:.]+$/, ""))) return false;
  if (/^[•●▪–—\-\u2022]/.test(next)) return false;
  if (/[.!?:]$/.test(prev)) return false;
  if (prev.endsWith("-") && /^[a-z]/.test(next)) return true;
  if (prev.length < 88 && /^[a-z]/.test(next)) return true;
  return false;
}

function toParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let current = "";
  const push = () => {
    const text = current.replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(text);
    current = "";
  };
  for (const line of lines) {
    if (/^[•●▪–—\-\u2022]\s+/.test(line)) {
      push();
      paragraphs.push(`• ${line.replace(/^[•●▪–—\-\u2022]\s+/, "")}`);
      continue;
    }
    if (!current) {
      current = line;
      continue;
    }
    current += ` ${line}`;
    if (line.length > 90 || /[.!?]$/.test(line)) push();
  }
  push();
  return paragraphs;
}

function titleCaseHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .replace("&", "&");
}
