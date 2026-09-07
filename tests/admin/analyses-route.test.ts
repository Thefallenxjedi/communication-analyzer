import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  listAnalyses,
  getAnalysisStats,
  backfillAnalysisDuration,
  deleteAnalysis,
  deleteAnalyses,
  getSurveyRatingsBySlugs,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  listAnalyses: vi.fn(),
  getAnalysisStats: vi.fn(),
  backfillAnalysisDuration: vi.fn(),
  deleteAnalysis: vi.fn(),
  deleteAnalyses: vi.fn(),
  getSurveyRatingsBySlugs: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/analyses", () => ({
  listAnalyses,
  getAnalysisStats,
  backfillAnalysisDuration,
  deleteAnalysis,
  deleteAnalyses,
}));

vi.mock("@/lib/surveys", () => ({
  getSurveyRatingsBySlugs,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
  getConvexUrl: () => "https://convex.example",
  isConvexConfigured: () => true,
}));

import {
  DELETE,
  GET,
} from "@/app/api/admin/analyses/route";

const convex = { tag: "convex" };

describe("/api/admin/analyses", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    listAnalyses.mockResolvedValue([
      {
        id: "analysis-1",
        reportSlug: "report-1",
        createdAt: new Date().toISOString(),
        overallScore: 8,
      },
    ]);
    getAnalysisStats.mockResolvedValue({ totalAttempts: 1 });
    backfillAnalysisDuration.mockResolvedValue({ patched: 1 });
    deleteAnalysis.mockResolvedValue(true);
    deleteAnalyses.mockResolvedValue({ deleted: 2, missing: 1 });
    getSurveyRatingsBySlugs.mockResolvedValue({
      "report-1": { rating: 5, comment: "Great" },
    });
  });

  it("loads analyses and optional timing backfill with viewer access", async () => {
    const res = await GET(
      new Request("https://example.com/api/admin/analyses?backfillTiming=1"),
    );

    expect(res.status).toBe(200);
    expect(backfillAnalysisDuration).toHaveBeenCalledWith(20, convex);
    expect(listAnalyses).toHaveBeenCalledWith(100, convex);
    expect(getAnalysisStats).toHaveBeenCalledWith(convex);
    const body = await res.json();
    expect(body.analyses[0].surveyRating).toBe(5);
    expect(body.stats).toEqual({ totalAttempts: 1 });
  });

  it("rejects delete when editor auth fails", async () => {
    requireStaffConvex.mockResolvedValueOnce(
      Response.json({ error: "Insufficient permission." }, { status: 403 }),
    );

    const res = await DELETE(
      new Request("https://example.com/api/admin/analyses?id=analysis-1", {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(403);
    expect(deleteAnalysis).not.toHaveBeenCalled();
  });

  it("deletes a single analysis", async () => {
    const res = await DELETE(
      new Request("https://example.com/api/admin/analyses?id=analysis-1", {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(200);
    expect(deleteAnalysis).toHaveBeenCalledWith("analysis-1", convex);
    expect(await res.json()).toEqual({ ok: true, deleted: 1 });
  });

  it("bulk deletes multiple analyses", async () => {
    const res = await DELETE(
      new Request("https://example.com/api/admin/analyses", {
        method: "DELETE",
        body: JSON.stringify({ ids: ["a-1", "a-2", "a-2"] }),
      }),
    );

    expect(res.status).toBe(200);
    expect(deleteAnalyses).toHaveBeenCalledWith(["a-1", "a-2"], convex);
    expect(await res.json()).toEqual({ ok: true, deleted: 2, missing: 1 });
  });
});
