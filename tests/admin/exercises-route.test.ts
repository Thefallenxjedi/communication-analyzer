import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  listAdminCatalogExercises,
  seedProblemBibleCatalog,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  listAdminCatalogExercises: vi.fn(),
  seedProblemBibleCatalog: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/workout-exercises", () => ({
  listAdminCatalogExercises,
  listCatalogExercises: vi.fn().mockResolvedValue([]),
  seedProblemBibleCatalog,
}));

vi.mock("@/lib/exercise-catalog-import", () => ({
  parseCatalogImportText: vi.fn(),
  confirmCatalogImport: vi.fn(),
}));

vi.mock("@/lib/exercise-rag", () => ({
  invalidateExerciseRagCache: vi.fn(),
  warmCatalogEmbeddings: vi.fn(),
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
  workoutCatalogApi: {
    setEnabled: "setEnabled",
    remove: "remove",
    removeMany: "removeMany",
    upsert: "upsert",
    seedBatch: "seedBatch",
  },
}));

import { GET, POST } from "@/app/api/admin/exercises/route";

const convex = {
  mutation: vi.fn(),
};

describe("/api/admin/exercises", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    listAdminCatalogExercises.mockResolvedValue([
      { id: "ex-1", source: "problem-bible", enabled: true },
    ]);
    seedProblemBibleCatalog.mockResolvedValue({
      inserted: 10,
      updated: 0,
      skipped: 60,
    });
    convex.mutation.mockResolvedValue({ ok: true, id: "ex-1" });
  });

  it("loads the admin catalog", async () => {
    const res = await GET(new Request("https://example.com/api/admin/exercises"));
    expect(res.status).toBe(200);
    expect(listAdminCatalogExercises).toHaveBeenCalledWith(convex);
  });

  it("seeds the problem bible catalog through authenticated Convex", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/exercises", {
        method: "POST",
        body: JSON.stringify({ action: "seed", insertOnlyMissing: true }),
      }),
    );

    expect(res.status).toBe(200);
    expect(seedProblemBibleCatalog).toHaveBeenCalledWith({
      insertOnlyMissing: true,
      convex,
    });
  });

  it("toggles an exercise enabled flag", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/exercises", {
        method: "POST",
        body: JSON.stringify({
          action: "setEnabled",
          id: "ex-1",
          enabled: false,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(convex.mutation).toHaveBeenCalledWith("setEnabled", {
      id: "ex-1",
      enabled: false,
    });
  });
});
