import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  convex,
  getCoachingClient,
  enrollAndInviteClient,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  convex: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
  getCoachingClient: vi.fn(),
  enrollAndInviteClient: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/coaching-clients", () => ({
  getCoachingClient,
}));

vi.mock("@/lib/resend-invite", () => ({
  enrollAndInviteClient,
}));

vi.mock("@/lib/convex-server", () => ({
  coachingApi: {
    listPendingClients: "listPendingClients",
    approveClientSignup: "approveClientSignup",
  },
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import {
  GET,
  POST,
} from "@/app/api/admin/clients/pending/route";

describe("/api/admin/clients/pending", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    convex.query.mockResolvedValue([{ id: "client-1", name: "Pending" }]);
    convex.mutation.mockResolvedValue({ ok: true });
    getCoachingClient.mockResolvedValue({
      id: "client-1",
      name: "Pending",
      email: "pending@example.com",
    });
    enrollAndInviteClient.mockResolvedValue({
      configured: true,
      sent: true,
      enrolled: true,
    });
  });

  it("loads pending clients for viewers", async () => {
    const res = await GET(
      new Request("https://example.com/api/admin/clients/pending"),
    );

    expect(res.status).toBe(200);
    expect(convex.query).toHaveBeenCalledWith("listPendingClients", {});
  });

  it("approves a pending signup for editors", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/clients/pending", {
        method: "POST",
        body: JSON.stringify({ clientId: "client-1" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(convex.mutation).toHaveBeenCalledWith("approveClientSignup", {
      id: "client-1",
    });
    expect(enrollAndInviteClient).toHaveBeenCalledWith({
      name: "Pending",
      email: "pending@example.com",
    });
    expect(await res.json()).toEqual({
      ok: true,
      invite: { configured: true, sent: true, enrolled: true },
    });
  });
});
