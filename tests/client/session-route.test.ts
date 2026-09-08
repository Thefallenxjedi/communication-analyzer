import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMyClientFromConvex } = vi.hoisted(() => ({
  fetchMyClientFromConvex: vi.fn(),
}));

vi.mock("@/lib/client-auth", () => ({
  fetchMyClientFromConvex,
}));
vi.mock("@/lib/convex-server", () => ({
  isConvexConfigured: () => true,
  formatConvexError: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

import { GET } from "@/app/api/client/session/route";

describe("/api/client/session", () => {
  beforeEach(() => {
    fetchMyClientFromConvex.mockResolvedValue({
      authenticated: true,
      needsRegistration: false,
      client: {
        id: "client-1",
        name: "Ada Client",
        email: "ada@example.com",
        currentDay: 4,
        programDays: 90,
        currentFocus: "Executive presence",
        meetingLink: "https://example.com/meet",
        status: "active",
        currentStage: "Session 2",
        workSessionCount: 9,
        onboardingComplete: true,
        socialProfiles: [],
        adminNotes: "Private coaching context",
      },
    });
  });

  it("does not expose private admin notes to the client", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client.adminNotes).toBeUndefined();
  });
});
