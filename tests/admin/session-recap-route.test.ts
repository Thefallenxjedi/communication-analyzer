import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  resolveStaffAccess,
  getSessionRecap,
  saveSessionRecap,
  getCoachingClient,
  captureClientActivity,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  resolveStaffAccess: vi.fn(),
  getSessionRecap: vi.fn(),
  saveSessionRecap: vi.fn(),
  getCoachingClient: vi.fn(),
  captureClientActivity: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
  resolveStaffAccess,
}));

vi.mock("@/lib/session-recap", () => ({
  getSessionRecap,
  saveSessionRecap,
}));

vi.mock("@/lib/coaching-clients", () => ({
  getCoachingClient,
}));

vi.mock("@/lib/posthog-client-activity", () => ({
  captureClientActivity,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import { POST } from "@/app/api/admin/session-recap/route";

const convex = { tag: "convex" };

function saveRequest(sessionNumber = 3) {
  return new Request("https://example.com/api/admin/session-recap", {
    method: "POST",
    body: JSON.stringify({
      clientId: "client-1",
      sessionNumber,
      recapSummary: "You opened with the decision and stopped early.",
    }),
  });
}

describe("POST /api/admin/session-recap", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    resolveStaffAccess.mockResolvedValue({
      id: "staff-1",
      email: "coach@example.com",
      name: "Coach",
      staffRole: "admin",
    });
    getSessionRecap.mockResolvedValue(null);
    saveSessionRecap.mockResolvedValue({ ok: true });
    getCoachingClient.mockResolvedValue({
      id: "client-1",
      name: "Anuradha",
      email: "anuradha@example.com",
      workSessionCount: 9,
    });
    captureClientActivity.mockResolvedValue(undefined);
  });

  it("records summary_added for the client and the admin on the first save", async () => {
    const res = await POST(saveRequest());

    expect(res.status).toBe(200);
    expect(captureClientActivity).toHaveBeenCalledTimes(2);
    expect(captureClientActivity).toHaveBeenNthCalledWith(1, {
      distinctId: "client-1",
      event: "summary_added",
      properties: {
        summary_number: 3,
        session_label: "Session 3",
      },
      person: {
        email: "anuradha@example.com",
        name: "Anuradha",
        role: "client",
      },
    });
    expect(captureClientActivity).toHaveBeenNthCalledWith(2, {
      distinctId: "staff-1",
      event: "summary_added",
      properties: {
        summary_number: 3,
        session_label: "Session 3",
      },
      person: {
        email: "coach@example.com",
        name: "Coach",
        role: "admin",
      },
    });
  });

  it("does not record summary_added when the summary is replaced", async () => {
    getSessionRecap.mockResolvedValue({
      sessionNumber: 3,
      recapSummary: "Existing summary",
      recapUpdatedAt: "2026-10-01T00:00:00.000Z",
    });

    const res = await POST(saveRequest());

    expect(res.status).toBe(200);
    expect(captureClientActivity).not.toHaveBeenCalled();
  });
});
