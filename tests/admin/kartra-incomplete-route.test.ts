import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  listIncompleteForKartra,
  markKartraIncompleteSynced,
  syncIncompleteLeadToKartra,
  isKartraConfigured,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  listIncompleteForKartra: vi.fn(),
  markKartraIncompleteSynced: vi.fn(),
  syncIncompleteLeadToKartra: vi.fn(),
  isKartraConfigured: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({ requireStaffConvex }));

vi.mock("@/lib/analyses", () => ({
  listIncompleteForKartra,
  markKartraIncompleteSynced,
}));

vi.mock("@/lib/kartra", () => ({
  incompleteListName: () => "Free_tool_not-attempted",
  isKartraConfigured,
  syncIncompleteLeadToKartra,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
  isConvexConfigured: () => true,
}));

import { GET, POST } from "@/app/api/admin/kartra-incomplete/route";

const convex = { tag: "convex" };

const queue = {
  pending: [
    { email: "a@x.com", firstName: "Ann", ids: ["r1", "r2"], createdAt: 2 },
    { email: "b@x.com", firstName: "Bob", ids: ["r3"], createdAt: 1 },
  ],
  alreadySent: 4,
  skippedCompleted: 1,
  lastSyncedAt: Date.UTC(2026, 9, 13, 15, 0, 0),
};

describe("/api/admin/kartra-incomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffConvex.mockResolvedValue(convex);
    isKartraConfigured.mockReturnValue(true);
    listIncompleteForKartra.mockResolvedValue(queue);
    markKartraIncompleteSynced.mockResolvedValue(2);
    syncIncompleteLeadToKartra.mockImplementation(async ({ email }) =>
      email === "b@x.com"
        ? { ok: false, message: "List not found" }
        : { ok: true },
    );
  });

  it("returns pending count for viewers", async () => {
    const res = await GET(new Request("https://example.com/api/admin/kartra-incomplete"));
    expect(res.status).toBe(200);
    expect(requireStaffConvex).toHaveBeenCalledWith(expect.any(Request), "viewer");
    expect(await res.json()).toEqual({
      listName: "Free_tool_not-attempted",
      kartraConfigured: true,
      pending: 2,
      alreadySent: 4,
      skippedCompleted: 1,
      lastSyncedAt: "2026-10-13T15:00:00.000Z",
    });
  });

  it("rejects send without editor access", async () => {
    requireStaffConvex.mockResolvedValueOnce(
      Response.json({ error: "Insufficient permission." }, { status: 403 }),
    );
    const res = await POST(
      new Request("https://example.com/api/admin/kartra-incomplete", { method: "POST" }),
    );
    expect(res.status).toBe(403);
    expect(syncIncompleteLeadToKartra).not.toHaveBeenCalled();
  });

  it("sends leads and only marks successful ones", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/kartra-incomplete", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    expect(syncIncompleteLeadToKartra).toHaveBeenCalledWith({
      email: "a@x.com",
      firstName: "Ann",
    });
    expect(markKartraIncompleteSynced).toHaveBeenCalledWith(["r1", "r2"], convex);
    expect(await res.json()).toEqual({
      ok: true,
      listName: "Free_tool_not-attempted",
      sent: 1,
      failed: [{ email: "b@x.com", message: "List not found" }],
      remaining: 0,
    });
  });

  it("skips excluded emails", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/kartra-incomplete", {
        method: "POST",
        body: JSON.stringify({ exclude: ["B@x.com"] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(syncIncompleteLeadToKartra).toHaveBeenCalledTimes(1);
  });

  it("refuses when Kartra is not configured", async () => {
    isKartraConfigured.mockReturnValue(false);
    const res = await POST(
      new Request("https://example.com/api/admin/kartra-incomplete", { method: "POST" }),
    );
    expect(res.status).toBe(503);
  });
});
