import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMyStaffFromConvex,
  getAuthedConvexClient,
  requireStaff,
  convex,
} = vi.hoisted(() => ({
  fetchMyStaffFromConvex: vi.fn(),
  getAuthedConvexClient: vi.fn(),
  requireStaff: vi.fn(),
  convex: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
}));

vi.mock("@/lib/staff-auth", () => ({
  fetchMyStaffFromConvex,
  getAuthedConvexClient,
  requireStaff,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
  isConvexConfigured: () => true,
  staffApi: {
    listStaff: "listStaff",
    setStaffRole: "setStaffRole",
  },
}));

import { GET, POST } from "@/app/api/admin/staff/route";

describe("/api/admin/staff", () => {
  beforeEach(() => {
    fetchMyStaffFromConvex.mockResolvedValue({
      authenticated: true,
      staffRole: "admin",
      email: "owner@example.com",
    });
    requireStaff.mockResolvedValue({
      email: "owner@example.com",
      staffRole: "admin",
    });
    getAuthedConvexClient.mockResolvedValue(convex);
    convex.query.mockResolvedValue({
      members: [{ id: "1", email: "owner@example.com", staffRole: "admin" }],
      pending: [{ id: "2", email: "viewer@example.com", staffRole: "viewer" }],
    });
    convex.mutation.mockResolvedValue({ ok: true });
  });

  it("loads team data only for admin requests", async () => {
    const res = await GET(
      new Request("https://example.com/api/admin/staff?team=1"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.teamMembers).toHaveLength(1);
    expect(body.teamPending).toHaveLength(1);
    expect(requireStaff).toHaveBeenCalledWith(expect.any(Request), "admin");
  });

  it("rejects staff writes without admin access", async () => {
    requireStaff.mockResolvedValueOnce(
      Response.json({ error: "Insufficient permission." }, { status: 403 }),
    );

    const res = await POST(
      new Request("https://example.com/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({
          email: "viewer@example.com",
          staffRole: "viewer",
        }),
      }),
    );

    expect(res.status).toBe(403);
    expect(convex.mutation).not.toHaveBeenCalled();
  });
});
