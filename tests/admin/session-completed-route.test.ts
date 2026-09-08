import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  getCoachingClient,
  sendSessionCompletedEvent,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  getCoachingClient: vi.fn(),
  sendSessionCompletedEvent: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({ requireStaffConvex }));
vi.mock("@/lib/coaching-clients", () => ({ getCoachingClient }));
vi.mock("@/lib/resend-invite", () => ({ sendSessionCompletedEvent }));
vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import { POST } from "@/app/api/admin/clients/[id]/session-completed/route";

const convex = { tag: "convex" };
const context = { params: Promise.resolve({ id: "client-1" }) };

describe("POST /api/admin/clients/[id]/session-completed", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    getCoachingClient.mockResolvedValue({
      id: "client-1",
      name: "Joseph Todd",
      email: "joseph@example.com",
      workSessionCount: 9,
    });
    sendSessionCompletedEvent.mockResolvedValue({
      configured: true,
      sent: true,
    });
  });

  it("sends the saved client and selected session", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/clients/client-1/session-completed", {
        method: "POST",
        body: JSON.stringify({ sessionNumber: 4 }),
      }),
      context,
    );

    expect(res.status).toBe(200);
    expect(sendSessionCompletedEvent).toHaveBeenCalledWith({
      name: "Joseph Todd",
      email: "joseph@example.com",
      sessionNumber: 4,
    });
  });

  it("rejects an invalid session number", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/clients/client-1/session-completed", {
        method: "POST",
        body: JSON.stringify({ sessionNumber: 99 }),
      }),
      context,
    );

    expect(res.status).toBe(400);
    expect(sendSessionCompletedEvent).not.toHaveBeenCalled();
  });

  it("surfaces a failed Resend event", async () => {
    sendSessionCompletedEvent.mockResolvedValueOnce({
      configured: true,
      sent: false,
      error: "Event rejected",
    });

    const res = await POST(
      new Request("https://example.com/api/admin/clients/client-1/session-completed", {
        method: "POST",
        body: JSON.stringify({ sessionNumber: 1 }),
      }),
      context,
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "Event rejected" });
  });
});
