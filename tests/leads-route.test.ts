import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  attachLeadToAnalysis,
  syncFreeToolContact,
  isConvexConfigured,
  isGoHighLevelConfigured,
} = vi.hoisted(() => ({
  attachLeadToAnalysis: vi.fn(),
  syncFreeToolContact: vi.fn(),
  isConvexConfigured: vi.fn(() => true),
  isGoHighLevelConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/analyses", () => ({
  attachLeadToAnalysis,
}));

vi.mock("@/lib/convex-server", () => ({
  isConvexConfigured,
}));

vi.mock("@/lib/gohighlevel", () => ({
  isGoHighLevelConfigured,
  syncFreeToolContact,
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (task: () => unknown) => {
      void task();
    },
  };
});

import { POST } from "@/app/api/leads/route";

function request(body: unknown, ip = "203.0.113.40") {
  return new Request("https://example.com/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const lead = {
  firstName: "Jane",
  email: "jane@gmail.com",
  anonymousId: "anon-1",
  source: "homepage",
};

describe("POST /api/leads", () => {
  beforeEach(() => {
    attachLeadToAnalysis.mockReset();
    syncFreeToolContact.mockReset();
    isConvexConfigured.mockReturnValue(true);
    isGoHighLevelConfigured.mockReturnValue(true);
    attachLeadToAnalysis.mockResolvedValue(true);
    syncFreeToolContact.mockResolvedValue({
      ok: true,
      contactId: "abc12345contact",
      created: true,
    });
  });

  it("sends a saved free-tool lead to GoHighLevel", async () => {
    const response = await POST(request(lead, "203.0.113.41"));
    const data = (await response.json()) as { ok?: boolean };

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    await vi.waitFor(() => {
      expect(syncFreeToolContact).toHaveBeenCalledWith({
        name: "Jane",
        email: "jane@gmail.com",
      });
    });
  });

  it("saves the lead when GoHighLevel is not configured", async () => {
    isGoHighLevelConfigured.mockReturnValue(false);

    const response = await POST(request(lead, "203.0.113.44"));
    const data = (await response.json()) as { ok?: boolean; email?: string };

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.email).toBe("jane@gmail.com");
    expect(attachLeadToAnalysis).toHaveBeenCalled();
    expect(syncFreeToolContact).not.toHaveBeenCalled();
  });

  it("does not sync when the lead is not saved", async () => {
    attachLeadToAnalysis.mockResolvedValue(false);

    const response = await POST(request(lead, "203.0.113.42"));

    expect(response.status).toBe(500);
    expect(syncFreeToolContact).not.toHaveBeenCalled();
  });

  it("does not sync an invalid submission", async () => {
    const response = await POST(
      request({ ...lead, email: "not-an-email" }, "203.0.113.43"),
    );

    expect(response.status).toBe(400);
    expect(syncFreeToolContact).not.toHaveBeenCalled();
  });
});
