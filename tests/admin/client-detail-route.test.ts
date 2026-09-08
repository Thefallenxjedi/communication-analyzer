import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCoachingClient,
  requireStaffConvex,
  setCoachingClientAdminNotes,
} = vi.hoisted(() => ({
  getCoachingClient: vi.fn(),
  requireStaffConvex: vi.fn(),
  setCoachingClientAdminNotes: vi.fn(),
}));

vi.mock("@/lib/coaching-clients", () => ({
  getCoachingClient,
  setCoachingClientAdminNotes,
}));
vi.mock("@/lib/coaching-sessions", () => ({
  listCoachingSessions: vi.fn(),
}));
vi.mock("@/lib/coaching-tasks", () => ({
  ensureCoachingProgram: vi.fn(),
  listCoachingTasks: vi.fn(),
}));
vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));
vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

import { PATCH } from "@/app/api/admin/clients/[id]/route";

const convex = { tag: "convex" };

describe("admin client detail notes", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    setCoachingClientAdminNotes.mockResolvedValue({ ok: true });
    getCoachingClient.mockResolvedValue({
      id: "client-1",
      adminNotes: "Follow up after the keynote.",
    });
  });

  it("saves one private global note document for the client", async () => {
    const response = await PATCH(
      new Request("https://example.com/api/admin/clients/client-1", {
        method: "PATCH",
        body: JSON.stringify({
          adminNotes: "Follow up after the keynote.",
        }),
      }),
      { params: Promise.resolve({ id: "client-1" }) },
    );

    expect(response.status).toBe(200);
    expect(setCoachingClientAdminNotes).toHaveBeenCalledWith(
      {
        id: "client-1",
        adminNotes: "Follow up after the keynote.",
      },
      convex,
    );
  });
});
