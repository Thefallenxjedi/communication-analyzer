import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  listCoachingClients,
  createCoachingClient,
  getCoachingClientByEmail,
  updateCoachingClient,
  removeCoachingClient,
  enrollAndInviteClient,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  listCoachingClients: vi.fn(),
  createCoachingClient: vi.fn(),
  getCoachingClientByEmail: vi.fn(),
  updateCoachingClient: vi.fn(),
  removeCoachingClient: vi.fn(),
  enrollAndInviteClient: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/coaching-clients", () => ({
  listCoachingClients,
  createCoachingClient,
  getCoachingClientByEmail,
  updateCoachingClient,
  removeCoachingClient,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

vi.mock("@/lib/resend-invite", () => ({
  enrollAndInviteClient,
}));

import {
  DELETE,
  GET,
  PATCH,
  POST,
} from "@/app/api/admin/clients/route";

const convex = { tag: "convex" };

describe("/api/admin/clients", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    listCoachingClients.mockResolvedValue([{ id: "client-1", name: "Sam" }]);
    createCoachingClient.mockResolvedValue({ ok: true, id: "client-1" });
    getCoachingClientByEmail.mockResolvedValue(null);
    updateCoachingClient.mockResolvedValue({ ok: true });
    removeCoachingClient.mockResolvedValue({ ok: true });
    enrollAndInviteClient.mockResolvedValue({
      configured: true,
      sent: true,
      enrolled: true,
    });
  });

  it("allows viewer reads through authenticated Convex", async () => {
    const res = await GET(new Request("https://example.com/api/admin/clients"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      clients: [{ id: "client-1", name: "Sam" }],
    });
    expect(requireStaffConvex).toHaveBeenCalledWith(
      expect.any(Request),
      "viewer",
    );
    expect(listCoachingClients).toHaveBeenCalledWith(convex);
  });

  it("rejects create when editor auth fails", async () => {
    requireStaffConvex.mockResolvedValueOnce(
      Response.json({ error: "Insufficient permission." }, { status: 403 }),
    );

    const res = await POST(
      new Request("https://example.com/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({ name: "Sam", email: "sam@example.com" }),
      }),
    );

    expect(res.status).toBe(403);
    expect(createCoachingClient).not.toHaveBeenCalled();
  });

  it("creates a client and refreshes the list", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          name: "Sam",
          email: "sam@example.com",
          startDate: "2026-09-06",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(createCoachingClient).toHaveBeenCalledWith(
      {
        name: "Sam",
        email: "sam@example.com",
        startDate: "2026-09-06",
        currentFocus: undefined,
        meetingLink: undefined,
      },
      convex,
    );
    expect(enrollAndInviteClient).toHaveBeenCalledWith({
      name: "Sam",
      email: "sam@example.com",
    });
    expect(await res.json()).toEqual({
      ok: true,
      accessGranted: true,
      id: "client-1",
      alreadyExisted: false,
      clients: [{ id: "client-1", name: "Sam" }],
      invite: { configured: true, sent: true, enrolled: true },
    });
  });

  it("still sends the welcome email if the client already exists", async () => {
    createCoachingClient.mockResolvedValueOnce({
      ok: false,
      error: "A user with this email already exists",
    });
    getCoachingClientByEmail.mockResolvedValueOnce({
      id: "client-1",
      name: "Sam",
      email: "sam@example.com",
    });

    const res = await POST(
      new Request("https://example.com/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({ name: "Sam", email: "sam@example.com" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(enrollAndInviteClient).toHaveBeenCalledWith({
      name: "Sam",
      email: "sam@example.com",
    });
    expect(await res.json()).toMatchObject({
      ok: true,
      accessGranted: true,
      id: "client-1",
      alreadyExisted: true,
      invite: { sent: true },
    });
  });

  it("returns JSON if Resend throws after create", async () => {
    enrollAndInviteClient.mockRejectedValueOnce(new Error("boom"));

    const res = await POST(
      new Request("https://example.com/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({ name: "Sam", email: "sam@example.com" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      accessGranted: true,
      id: "client-1",
      invite: { sent: false, error: "boom" },
    });
  });

  it("validates update payloads", async () => {
    const res = await PATCH(
      new Request("https://example.com/api/admin/clients", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "id required." });
    expect(updateCoachingClient).not.toHaveBeenCalled();
  });

  it("deletes a client and refreshes the list", async () => {
    const res = await DELETE(
      new Request("https://example.com/api/admin/clients?id=client-1", {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(200);
    expect(removeCoachingClient).toHaveBeenCalledWith("client-1", convex);
    expect(await res.json()).toEqual({
      ok: true,
      clients: [{ id: "client-1", name: "Sam" }],
    });
  });
});
