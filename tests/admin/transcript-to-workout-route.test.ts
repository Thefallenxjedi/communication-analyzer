import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  getCoachingClient,
  getIntroCallReport,
  generateWorkoutFromTranscript,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  getCoachingClient: vi.fn(),
  getIntroCallReport: vi.fn(),
  generateWorkoutFromTranscript: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/coaching-clients", () => ({
  getCoachingClient,
}));

vi.mock("@/lib/intro-call", () => ({
  getIntroCallReport,
}));

vi.mock("@/lib/transcript-to-workout", () => ({
  generateWorkoutFromTranscript,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import { POST } from "@/app/api/admin/transcript-to-workout/route";

const convex = { tag: "convex" };

describe("/api/admin/transcript-to-workout", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    getCoachingClient.mockResolvedValue({
      id: "client-1",
      name: "Sam",
      currentFocus: "Pacing",
      linkedinProfileJson: '{"headline":"Founder"}',
      linkedinText: "Founder building a communication platform.",
      socialProfiles: ["@sam-speaks", "https://example.com/sam"],
    });
    getIntroCallReport.mockResolvedValue({
      summary: "Baseline summary",
      challenges: [{ title: "Hedging" }, { title: "Slow open" }],
    });
    generateWorkoutFromTranscript.mockResolvedValue({ summary: "Draft" });
  });

  it("rejects invalid source session numbers", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/transcript-to-workout", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client-1",
          transcript: "Coach: hello",
          sourceSessionNumber: 0,
          targetSessionNumber: 2,
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(generateWorkoutFromTranscript).not.toHaveBeenCalled();
  });

  it("builds a draft from transcript context", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/transcript-to-workout", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client-1",
          transcript: "Coach: hello",
          sourceSessionNumber: 2,
          targetSessionNumber: 3,
          mode: "both",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(getCoachingClient).toHaveBeenCalledWith("client-1", convex);
    expect(getIntroCallReport).toHaveBeenCalledWith("client-1", convex);
    expect(generateWorkoutFromTranscript).toHaveBeenCalledWith({
      transcript: "Coach: hello",
      sourceSessionNumber: 2,
      targetSessionNumber: 3,
      clientName: "Sam",
      currentFocus: "Pacing",
      introSummary: "Baseline summary",
      introChallenges: ["Hedging", "Slow open"],
      profileContext:
        'Structured professional profile:\n{"headline":"Founder"}\n\n' +
        "Submitted professional profile text:\nFounder building a communication platform.\n\n" +
        "Submitted social profile URLs and handles:\n- @sam-speaks\n- https://example.com/sam",
      mode: "both",
    });
    expect(await res.json()).toEqual({ draft: { summary: "Draft" } });
  });
});
