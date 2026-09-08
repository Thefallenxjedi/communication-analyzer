import { describe, expect, it } from "vitest";
import {
  batchChunksForParse,
  slugifyExerciseName,
  splitCatalogImportText,
} from "@/lib/exercise-catalog-import";

describe("exercise catalog import chunking", () => {
  it("splits on --- separators", () => {
    const chunks = splitCatalogImportText(
      ["Drill A\nDo this.", "---", "Drill B\nDo that."].join("\n"),
    );
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain("Drill A");
    expect(chunks[1]).toContain("Drill B");
  });

  it("splits on Exercise N headings", () => {
    const chunks = splitCatalogImportText(`Exercise 1: Campfire
Say one sentence.

Exercise 2: Compression
Keep it to 30 seconds.`);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toMatch(/Campfire/);
    expect(chunks[1]).toMatch(/Compression/);
  });

  it("batches one chunk per LLM call so drills are not merged", () => {
    const batches = batchChunksForParse(["a", "b", "c"]);
    expect(batches).toEqual([["a"], ["b"], ["c"]]);
  });

  it("builds stable slugs with problem prefixes", () => {
    expect(slugifyExerciseName("I Believe That", 1, 1)).toBe(
      "p01-e1-i-believe-that",
    );
  });

  it("reports batch progress metadata when parsing a slice", async () => {
    const { parseCatalogImportText } = await import(
      "@/lib/exercise-catalog-import"
    );
    const text = [
      "Exercise 1: Alpha",
      "Do the alpha drill with clear steps and enough body text here.",
      "",
      "Exercise 2: Beta",
      "Do the beta drill with clear steps and enough body text here.",
    ].join("\n");
    const result = await parseCatalogImportText({
      text,
      batchIndex: 0,
      batchesPerRequest: 1,
      apiKey: "",
    });
    expect(result.chunkCount).toBeGreaterThanOrEqual(2);
    expect(result.batchCount).toBeGreaterThanOrEqual(1);
    expect(typeof result.done).toBe("boolean");
  });
});