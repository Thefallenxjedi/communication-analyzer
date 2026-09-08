import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getActiveClientSession,
  saveClientOnboarding,
} = vi.hoisted(() => ({
  getActiveClientSession: vi.fn(),
  saveClientOnboarding: vi.fn(),
}));

vi.mock("@/lib/client-auth", () => ({
  getActiveClientSession,
}));

vi.mock("@/lib/coaching-clients", () => ({
  getCoachingStorageUrl: vi.fn(),
  saveClientOnboarding,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
  isConvexConfigured: () => true,
}));

vi.mock("@/lib/linkedin-profile", () => ({
  profileFromLinkedInPdf: vi.fn(),
  profileFromLinkedInText: vi.fn(),
}));

vi.mock("@/lib/pdf-text", () => ({
  pdfToText: vi.fn(),
}));

import { POST } from "@/app/api/client/onboarding/route";

describe("/api/client/onboarding profile updates", () => {
  beforeEach(() => {
    getActiveClientSession.mockResolvedValue({
      client: {
        id: "client-1",
        name: "Sam",
        onboardingComplete: true,
      },
    });
    saveClientOnboarding.mockResolvedValue({ ok: true });
  });

  it("updates social handles after initial onboarding", async () => {
    const response = await POST(
      new Request("https://example.com/api/client/onboarding", {
        method: "POST",
        body: JSON.stringify({
          socialProfiles: [
            " @sam ",
            "@sam",
            "https://instagram.com/sam",
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(saveClientOnboarding).toHaveBeenCalledWith({
      clientId: "client-1",
      socialProfiles: ["@sam", "https://instagram.com/sam"],
    });
  });

  it("rejects an empty profile submission", async () => {
    const response = await POST(
      new Request("https://example.com/api/client/onboarding", {
        method: "POST",
        body: JSON.stringify({ socialProfiles: [] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(saveClientOnboarding).not.toHaveBeenCalled();
  });
});
