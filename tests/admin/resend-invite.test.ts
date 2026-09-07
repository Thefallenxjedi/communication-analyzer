import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, add, send, list } = vi.hoisted(() => ({
  create: vi.fn(),
  add: vi.fn(),
  send: vi.fn(),
  list: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    contacts = {
      create,
      segments: { add },
    };
    emails = { send };
    segments = { list };
  },
}));

import { enrollAndInviteClient } from "@/lib/resend-invite";

describe("enrollAndInviteClient", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "EliteSpeak <hello@elitespeakprogram.com>";
    process.env.RESEND_WELCOME_TEMPLATE = "Welcome_email";
    process.env.RESEND_SEGMENT_NAME = "user_registered";
    delete process.env.RESEND_SEGMENT_ID;
    create.mockResolvedValue({ data: { id: "contact-1" }, error: null });
    add.mockResolvedValue({ data: { id: "seg-link" }, error: null });
    send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    list.mockResolvedValue({
      data: {
        data: [{ id: "seg-user-registered", name: "user_registered" }],
      },
      error: null,
    });
  });

  it("skips when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      enrollAndInviteClient({ name: "Sam", email: "sam@example.com" }),
    ).resolves.toEqual({
      configured: false,
      sent: false,
      enrolled: false,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("sends the welcome email even if segment enroll fails", async () => {
    list.mockResolvedValueOnce({
      data: { data: [] },
      error: null,
    });

    await expect(
      enrollAndInviteClient({ name: "Joseph Todd", email: "joseph@example.com" }),
    ).resolves.toEqual({
      configured: true,
      sent: true,
      enrolled: false,
    });

    expect(send).toHaveBeenCalled();
    expect(send.mock.calls[0][0]).toMatchObject({
      from: "EliteSpeak <hello@elitespeakprogram.com>",
      to: "joseph@example.com",
      template: {
        id: "Welcome_email",
        variables: {
          CLIENT_NAME: "Joseph",
          JOIN_URL: "https://app.elitespeakprogram.com/client/login",
        },
      },
    });
  });

  it("adds the contact to user_registered after sending", async () => {
    await expect(
      enrollAndInviteClient({ name: "Joseph Todd", email: "joseph@example.com" }),
    ).resolves.toEqual({
      configured: true,
      sent: true,
      enrolled: true,
    });

    expect(create).toHaveBeenCalledWith({
      email: "joseph@example.com",
      firstName: "Joseph",
      lastName: "Todd",
      unsubscribed: false,
    });
    expect(add).toHaveBeenCalledWith({
      email: "joseph@example.com",
      segmentId: "seg-user-registered",
    });
  });
});
