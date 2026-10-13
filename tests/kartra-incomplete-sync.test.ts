import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncIncompleteLeadToKartra } from "@/lib/kartra";

function kartraResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("syncIncompleteLeadToKartra", () => {
  beforeEach(() => {
    vi.stubEnv("KARTRA_APP_ID", "app");
    vi.stubEnv("KARTRA_API_KEY", "key");
    vi.stubEnv("KARTRA_API_PASSWORD", "pass");
    vi.stubEnv("KARTRA_INCOMPLETE_LIST_NAME", "Free_tool_not-attempted");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails when Kartra reports a list error inside a top-level Success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(kartraResponse({ status: "Success" }))
      .mockResolvedValueOnce(
        kartraResponse({
          status: "Success",
          lead: { Status: "Found" },
          actions: [
            {
              subscribe_lead_to_list: {
                status: "Error",
                message: "List does not exist",
                type: "231",
              },
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncIncompleteLeadToKartra({
      email: "a@x.com",
      firstName: "Ann",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("List does not exist");
    expect(result.message).toContain("Free_tool_not-attempted");
    const subscribeBody = String(fetchMock.mock.calls[1][1].body);
    expect(subscribeBody).toContain("list_name%5D=Free_tool_not-attempted");
  });

  it("succeeds when the subscribe action succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(kartraResponse({ status: "Success" }))
        .mockResolvedValueOnce(
          kartraResponse({
            status: "Success",
            actions: [
              {
                subscribe_lead_to_list: {
                  status: "Success",
                  message: "Lead subscribed to list",
                  type: "101",
                },
              },
            ],
          }),
        ),
    );

    const result = await syncIncompleteLeadToKartra({
      email: "a@x.com",
      firstName: "Ann",
    });
    expect(result.ok).toBe(true);
  });
});
