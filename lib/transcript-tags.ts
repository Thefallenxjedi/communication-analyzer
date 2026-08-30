import { STAT_LABELS, type StatId } from "@/lib/schema";

export type TranscriptTag = {
  id: StatId;
  label: string;
};

export type TaggedSpan = {
  text: string;
  tag: TranscriptTag | null;
};

type Rule = {
  id: StatId;
  pattern: RegExp;
};

const RULES: Rule[] = [
  {
    id: "fillers",
    pattern: /\b(?:um+|uh+|er+|ah+|hmm+|uh-huh)\b|\byou know\b|\bi mean\b|\bbasically\b|\bliterally\b/gi,
  },
  {
    id: "hedging",
    pattern:
      /\b(?:i think|i guess|i feel like|maybe|perhaps|kind of|kinda|sort of|sorta|probably)\b/gi,
  },
  {
    id: "rambleTriggers",
    pattern: /\b(?:and then|and also|but yeah|so yeah|anyway)\b/gi,
  },
];

const LONG_SENTENCE_WORDS = 40;

function tagFor(id: StatId): TranscriptTag {
  return { id, label: STAT_LABELS[id] };
}

function collectMatches(sentence: string): Array<{
  start: number;
  end: number;
  tag: TranscriptTag;
}> {
  const hits: Array<{ start: number; end: number; tag: TranscriptTag }> = [];
  for (const rule of RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(sentence)) !== null) {
      if (match[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      hits.push({
        start: match.index,
        end: match.index + match[0].length,
        tag: tagFor(rule.id),
      });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: typeof hits = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    kept.push(hit);
    cursor = hit.end;
  }
  return kept;
}

export function tagSentence(sentence: string): {
  spans: TaggedSpan[];
  tags: TranscriptTag[];
} {
  const matches = collectMatches(sentence);
  const spans: TaggedSpan[] = [];
  let cursor = 0;
  const tags: TranscriptTag[] = [];
  const seen = new Set<StatId>();

  for (const hit of matches) {
    if (hit.start > cursor) {
      spans.push({ text: sentence.slice(cursor, hit.start), tag: null });
    }
    spans.push({ text: sentence.slice(hit.start, hit.end), tag: hit.tag });
    if (!seen.has(hit.tag.id)) {
      seen.add(hit.tag.id);
      tags.push(hit.tag);
    }
    cursor = hit.end;
  }
  if (cursor < sentence.length) {
    spans.push({ text: sentence.slice(cursor), tag: null });
  }

  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length >= LONG_SENTENCE_WORDS && !seen.has("rambling")) {
    tags.push(tagFor("rambling"));
  }

  return { spans: spans.length ? spans : [{ text: sentence, tag: null }], tags };
}

export function splitTranscriptSentences(transcript: string): string[] {
  const trimmed = transcript.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [trimmed];
}

/** Pull short verbatim snippets that match a known pattern (fillers, hedging, etc.). */
export function extractPatternQuotes(
  transcript: string,
  id: StatId,
  max = 3,
): string[] {
  const rule = RULES.find((r) => r.id === id);
  if (!rule) return [];
  const text = transcript.replace(/\s+/g, " ").trim();
  if (!text) return [];

  const re = new RegExp(rule.pattern.source, rule.pattern.flags);
  const quotes: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null && quotes.length < max) {
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    const start = match.index;
    const end = start + match[0].length;
    const before = text.slice(Math.max(0, start - 40), start);
    const after = text.slice(end, Math.min(text.length, end + 40));
    const left = before.split(/\s+/).slice(-5).join(" ");
    const right = after.split(/\s+/).slice(0, 5).join(" ");
    const snippet = `${left} ${match[0]} ${right}`.replace(/\s+/g, " ").trim();
    const key = snippet.toLowerCase();
    if (seen.has(key) || snippet.length < 2) continue;
    seen.add(key);
    quotes.push(snippet.length > 100 ? `${snippet.slice(0, 99).trimEnd()}…` : snippet);
  }

  return quotes;
}
