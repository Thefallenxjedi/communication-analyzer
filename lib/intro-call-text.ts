/** Split prose and an optional trailing callout (coach types `---` on its own line). */
export function splitCallout(text: string): {
  main: string;
  callout: string | null;
} {
  const trimmed = text.trim();
  if (!trimmed) return { main: "", callout: null };

  const parts = trimmed.split(/\n---\n|\n\n---\n\n/);
  if (parts.length <= 1) return { main: trimmed, callout: null };

  const callout = parts[parts.length - 1]?.trim() ?? "";
  const main = parts.slice(0, -1).join("\n\n").trim();
  if (!callout) return { main: trimmed, callout: null };
  return { main, callout };
}

export function splitParagraphs(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function padSectionIndex(n: number): string {
  return String(n).padStart(2, "0");
}

export function padRepNumber(n: number): string {
  return String(n).padStart(2, "0");
}
