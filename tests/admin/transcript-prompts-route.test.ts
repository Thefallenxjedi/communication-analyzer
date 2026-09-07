import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  getTranscriptPromptState,
  resetTranscriptPrompt,
  saveTranscriptPrompt,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  getTranscriptPromptState: vi.fn(),
  resetTranscriptPrompt: vi.fn(),
  saveTranscriptPrompt: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/transcript-prompts", () => ({
  getTranscriptPromptState,
  resetTranscriptPrompt,
  saveTranscriptPrompt,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import { GET, PUT } from "@/app/api/admin/transcript-prompts/route";

const convex = { tag: "convex" };
const prompts = {
  shared: {
    body: "shared prompt body",
    isOverride: true,
    updatedAt: "2026-09-06T00:00:00.000Z",
    codeDefault: "shared default",
  },
  summary: {
    body: "summary prompt body",
    isOverride: false,
    updatedAt: null,
    codeDefault: "summary default",
  },
  tasks: {
    body: "tasks prompt body",
    isOverride: false,
    updatedAt: null,
    codeDefault: "tasks default",
  },
};

describe("/api/admin/transcript-prompts", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    getTranscriptPromptState.mockResolvedValue(prompts);
    resetTranscriptPrompt.mockResolvedValue(true);
    saveTranscriptPrompt.mockResolvedValue({ ok: true });
  });

  it("loads the transcript prompt bundle", async () => {
    const res = await GET(
      new Request("https://example.com/api/admin/transcript-prompts"),
    );

    expect(res.status).toBe(200);
    expect(getTranscriptPromptState).toHaveBeenCalledWith(convex);
  });

  it("saves one prompt block", async () => {
    const res = await PUT(
      new Request("https://example.com/api/admin/transcript-prompts", {
        method: "PUT",
        body: JSON.stringify({
          key: "tasks",
          body: "This is a long enough prompt body for saving tasks.",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(saveTranscriptPrompt).toHaveBeenCalledWith(
      "tasks",
      "This is a long enough prompt body for saving tasks.",
      convex,
    );
  });

  it("resets one prompt block", async () => {
    const res = await PUT(
      new Request("https://example.com/api/admin/transcript-prompts", {
        method: "PUT",
        body: JSON.stringify({
          key: "summary",
          reset: true,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(resetTranscriptPrompt).toHaveBeenCalledWith("summary", convex);
  });
});
