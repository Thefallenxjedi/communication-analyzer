import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncFreeToolContact } from "@/lib/gohighlevel";

const TOKEN = "pit-secret-token";
const LOCATION = "loc_test_123";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("syncFreeToolContact", () => {
  const sleep = vi.fn(async () => {});

  beforeEach(() => {
    process.env.GHL_ACCESS_TOKEN = TOKEN;
    process.env.GHL_LOCATION_ID = LOCATION;
    sleep.mockClear();
  });

  afterEach(() => {
    delete process.env.GHL_ACCESS_TOKEN;
    delete process.env.GHL_LOCATION_ID;
  });

  it("does nothing when GoHighLevel is not configured", async () => {
    delete process.env.GHL_ACCESS_TOKEN;
    const fetchImpl = vi.fn();

    await expect(
      syncFreeToolContact(
        { name: "Jane Doe", email: "jane@gmail.com" },
        { fetchImpl, sleep },
      ),
    ).resolves.toEqual({
      ok: false,
      configured: false,
      reason: "not_configured",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("upserts name and email, then adds the tag without replacing existing tags", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          new: true,
          contact: { id: "seD4PfOuKoVMLkEZqohJ", email: "jane@gmail.com" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ tags: ["existing", "Communication_tool"] }, 201),
      );

    const result = await syncFreeToolContact(
      { name: "  Jane   Doe  ", email: " Jane@Gmail.com " },
      { fetchImpl, sleep },
    );

    expect(result).toEqual({
      ok: true,
      contactId: "seD4PfOuKoVMLkEZqohJ",
      created: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const [upsertUrl, upsertInit] = fetchImpl.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(upsertUrl).toBe("https://services.leadconnectorhq.com/contacts/upsert");
    expect(upsertInit.method).toBe("POST");
    expect(upsertInit.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    });
    expect(JSON.parse(String(upsertInit.body))).toEqual({
      locationId: LOCATION,
      firstName: "Jane Doe",
      email: "jane@gmail.com",
      createNewIfDuplicateAllowed: false,
    });

    const [tagUrl, tagInit] = fetchImpl.mock.calls[1] as [string, RequestInit];
    expect(tagUrl).toBe(
      "https://services.leadconnectorhq.com/contacts/seD4PfOuKoVMLkEZqohJ/tags",
    );
    expect(JSON.parse(String(tagInit.body))).toEqual({
      tags: ["Communication_tool"],
    });
  });

  it("updates an existing contact and still adds the tag", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          new: false,
          contact: { id: "abc12345existing" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ tags: ["Communication_tool"] }, 201));

    await expect(
      syncFreeToolContact(
        { name: "Jane Doe", email: "jane@gmail.com" },
        { fetchImpl, sleep },
      ),
    ).resolves.toMatchObject({ ok: true, created: false });
  });

  it("retries a transient failure and does not claim success until the tag is confirmed", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "unavailable" }, 503))
      .mockResolvedValueOnce(
        jsonResponse({ new: true, contact: { id: "abc12345contact" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ tags: ["Communication_tool"] }, 201));

    const result = await syncFreeToolContact(
      { name: "Jane Doe", email: "jane@gmail.com" },
      { fetchImpl, sleep },
    );

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(400);
  });

  it("does not retry invalid credentials", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "Invalid token" }, 401));

    const result = await syncFreeToolContact(
      { name: "Jane Doe", email: "jane@gmail.com" },
      { fetchImpl, sleep },
    );

    expect(result).toMatchObject({ ok: false, configured: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("sends an email-only lead when the name is missing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ new: true, contact: { id: "abc12345contact" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ tags: ["Communication_tool"] }, 201));

    await syncFreeToolContact(
      { name: "   ", email: "jane@gmail.com" },
      { fetchImpl, sleep },
    );

    expect(JSON.parse(String(fetchImpl.mock.calls[0][1].body))).toEqual({
      locationId: LOCATION,
      email: "jane@gmail.com",
      createNewIfDuplicateAllowed: false,
    });
  });

  it("rejects an invalid email before calling GoHighLevel", async () => {
    const fetchImpl = vi.fn();

    await expect(
      syncFreeToolContact(
        { name: "Jane", email: "not-an-email" },
        { fetchImpl, sleep },
      ),
    ).resolves.toMatchObject({ ok: false, reason: "invalid_email" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
