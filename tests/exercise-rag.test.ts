import { describe, expect, it } from "vitest";
import {
  catalogDocument,
  catalogFingerprint,
  cosineSimilarity,
  exerciseId,
  mergeRagHits,
  tightenRagHits,
} from "@/lib/exercise-rag";
import type { WorkoutExercise } from "@/lib/workout-exercises";

function exercise(partial: Partial<WorkoutExercise> & { id: string; name: string }): WorkoutExercise {
  return {
    purpose: "Purpose",
    timing: "5 min",
    instructions: "Do the drill.",
    whenToUse: "When rambling",
    tags: ["rambling"],
    ...partial,
  };
}

describe("exercise RAG helpers", () => {
  it("builds a retrieval document from catalog fields", () => {
    const doc = catalogDocument(
      exercise({
        id: "campfire",
        name: "Light the Campfire",
        problemNumber: 1,
        problemTitle: "Rambling",
        problemItSolves: "No beacon",
        tags: ["rambling", "clarity"],
      }),
    );

    expect(doc).toContain("Light the Campfire");
    expect(doc).toContain("Problem 1: Rambling");
    expect(doc).toContain("rambling, clarity");
  });

  it("changes the fingerprint when a catalog exercise is added", () => {
    const first = [exercise({ id: "a", name: "Drill A" })];
    const second = [
      exercise({ id: "a", name: "Drill A" }),
      exercise({ id: "b", name: "Drill B" }),
    ];

    expect(catalogFingerprint(first)).not.toBe(catalogFingerprint(second));
  });

  it("changes the fingerprint when an exercise is edited", () => {
    const before = catalogFingerprint([
      exercise({ id: "a", name: "Drill A", purpose: "Old purpose" }),
    ]);
    const after = catalogFingerprint([
      exercise({ id: "a", name: "Drill A", purpose: "New purpose" }),
    ]);

    expect(before).not.toBe(after);
  });

  it("scores identical vectors as 1", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("scores orthogonal vectors as 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("keeps the strongest hit per exercise and respects the limit", () => {
    const campfire = exercise({ id: "campfire", name: "Campfire" });
    const breath = exercise({ id: "breath", name: "Breath" });
    const merged = mergeRagHits(
      [
        { exercise: campfire, score: 0.4, matchedAsk: "rambling" },
        { exercise: campfire, score: 0.9, matchedAsk: "beacon" },
        { exercise: breath, score: 0.7, matchedAsk: "pace" },
      ],
      1,
    );

    expect(merged).toHaveLength(1);
    expect(exerciseId(merged[0].exercise)).toBe("campfire");
    expect(merged[0].score).toBe(0.9);
    expect(merged[0].matchedAsk).toBe("beacon");
  });

  it("drops a weaker off-family fourth drill", () => {
    const point = exercise({
      id: "p01-e1",
      name: "I Believe That",
      problemNumber: 1,
      problemTitle: "I Take Too Long to Get to the Point",
    });
    const compress = exercise({
      id: "p01-e2",
      name: "30-Second Compression",
      problemNumber: 1,
      problemTitle: "I Take Too Long to Get to the Point",
    });
    const beacon = exercise({
      id: "campfire",
      name: "Campfire",
    });
    const polished = exercise({
      id: "p18-e2",
      name: "Topic Sentence Habit",
      problemNumber: 18,
      problemTitle: "I Can't Turn Raw Thoughts Into Polished Speech",
    });

    const tightened = tightenRagHits(
      [
        { exercise: point, score: 0.86, matchedAsk: "lead with the point" },
        { exercise: compress, score: 0.84, matchedAsk: "lead with the point" },
        { exercise: beacon, score: 0.83, matchedAsk: "have the point" },
        { exercise: polished, score: 0.81, matchedAsk: "structure speech" },
      ],
      4,
    );

    expect(tightened.map((hit) => exerciseId(hit.exercise))).toEqual([
      "p01-e1",
      "p01-e2",
      "campfire",
    ]);
  });
});
