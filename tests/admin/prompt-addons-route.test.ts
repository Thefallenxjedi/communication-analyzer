import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  getDiagnosisCorePromptState,
  resetDiagnosisCorePrompt,
  saveDiagnosisCorePrompt,
  createPromptAddOn,
  listPromptAddOns,
  removePromptAddOn,
  setPromptAddOnEnabled,
  updatePromptAddOn,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  getDiagnosisCorePromptState: vi.fn(),
  resetDiagnosisCorePrompt: vi.fn(),
  saveDiagnosisCorePrompt: vi.fn(),
  createPromptAddOn: vi.fn(),
  listPromptAddOns: vi.fn(),
  removePromptAddOn: vi.fn(),
  setPromptAddOnEnabled: vi.fn(),
  updatePromptAddOn: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/diagnosis-core-prompt", () => ({
  getDiagnosisCorePromptState,
  resetDiagnosisCorePrompt,
  saveDiagnosisCorePrompt,
}));

vi.mock("@/lib/prompt-addons", () => ({
  createPromptAddOn,
  listPromptAddOns,
  removePromptAddOn,
  setPromptAddOnEnabled,
  updatePromptAddOn,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
} from "@/app/api/admin/prompt-addons/route";

const convex = { tag: "convex" };
const corePrompt = {
  body: "x".repeat(220),
  isOverride: false,
  updatedAt: null,
  codeDefault: "x".repeat(220),
};

describe("/api/admin/prompt-addons", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    getDiagnosisCorePromptState.mockResolvedValue(corePrompt);
    resetDiagnosisCorePrompt.mockResolvedValue(true);
    saveDiagnosisCorePrompt.mockResolvedValue({ ok: true });
    createPromptAddOn.mockResolvedValue({ ok: true, id: "addon-1" });
    listPromptAddOns.mockResolvedValue([{ id: "addon-1", title: "Tone" }]);
    removePromptAddOn.mockResolvedValue(true);
    setPromptAddOnEnabled.mockResolvedValue(true);
    updatePromptAddOn.mockResolvedValue(true);
  });

  it("loads prompt data for viewer access", async () => {
    const res = await GET(
      new Request("https://example.com/api/admin/prompt-addons"),
    );

    expect(res.status).toBe(200);
    expect(listPromptAddOns).toHaveBeenCalledWith(convex);
    expect(getDiagnosisCorePromptState).toHaveBeenCalledWith(convex);
  });

  it("saves the core prompt through authenticated Convex", async () => {
    const body = { body: "x".repeat(240) };
    const res = await PUT(
      new Request("https://example.com/api/admin/prompt-addons", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    );

    expect(res.status).toBe(200);
    expect(saveDiagnosisCorePrompt).toHaveBeenCalledWith(body.body, convex);
  });

  it("toggles an add-on enabled flag", async () => {
    const res = await PATCH(
      new Request("https://example.com/api/admin/prompt-addons", {
        method: "PATCH",
        body: JSON.stringify({ id: "addon-1", enabled: false }),
      }),
    );

    expect(res.status).toBe(200);
    expect(setPromptAddOnEnabled).toHaveBeenCalledWith(
      "addon-1",
      false,
      convex,
    );
    expect(await res.json()).toEqual({ ok: true });
  });

  it("creates and deletes add-ons", async () => {
    const createRes = await POST(
      new Request("https://example.com/api/admin/prompt-addons", {
        method: "POST",
        body: JSON.stringify({ title: "Tone", body: "Keep it concise." }),
      }),
    );
    expect(createRes.status).toBe(200);
    expect(createPromptAddOn).toHaveBeenCalledWith(
      { title: "Tone", body: "Keep it concise.", enabled: true },
      convex,
    );

    const deleteRes = await DELETE(
      new Request("https://example.com/api/admin/prompt-addons?id=addon-1", {
        method: "DELETE",
      }),
    );
    expect(deleteRes.status).toBe(200);
    expect(removePromptAddOn).toHaveBeenCalledWith("addon-1", convex);
  });
});
