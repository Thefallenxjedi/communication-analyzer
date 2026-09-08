import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEvent } = vi.hoisted(() => ({
  sendEvent: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    events = { send: sendEvent };
  },
}));

import {
  enrollAndInviteClient,
  sendSessionCompletedEvent,
} from "@/lib/resend-invite";

describe("enrollAndInviteClient", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_EVENT_NAME = "user_registered";
    delete process.env.RESEND_JOIN_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.elitespeakprogram.com";
    sendEvent.mockReset();
    sendEvent.mockResolvedValue({
      data: { object: "event", event: "user_registered" },
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
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("sends user_registered with the automation payload", async () => {
    await expect(
      enrollAndInviteClient({ name: "Joseph Todd", email: "joseph@example.com" }),
    ).resolves.toEqual({
      configured: true,
      sent: true,
      enrolled: true,
    });

    expect(sendEvent).toHaveBeenCalledWith({
      event: "user_registered",
      email: "joseph@example.com",
      payload: {
        JOIN_URL: "https://app.elitespeakprogram.com/client/login",
        CLIENT_NAME: "Joseph Todd",
      },
    });
  });

  it("uses the configured event name and join URL", async () => {
    process.env.RESEND_EVENT_NAME = "client_invited";
    process.env.RESEND_JOIN_URL = "https://example.com/join";

    await expect(
      enrollAndInviteClient({ name: "Sam", email: "SAM@example.com" }),
    ).resolves.toMatchObject({
      configured: true,
      sent: true,
      enrolled: true,
    });

    expect(sendEvent).toHaveBeenCalledWith({
      event: "client_invited",
      email: "sam@example.com",
      payload: {
        JOIN_URL: "https://example.com/join",
        CLIENT_NAME: "Sam",
      },
    });
  });

  it("returns the Resend event error", async () => {
    sendEvent.mockResolvedValueOnce({
      data: null,
      error: { message: "Event schema validation failed" },
    });

    await expect(
      enrollAndInviteClient({ name: "Sam", email: "sam@example.com" }),
    ).resolves.toEqual({
      configured: true,
      sent: false,
      enrolled: false,
      error: "Event schema validation failed",
    });
  });

  it("sends session_completed with client and session strings", async () => {
    await expect(
      sendSessionCompletedEvent({
        name: "Joseph Todd",
        email: "joseph@example.com",
        sessionNumber: 4,
      }),
    ).resolves.toEqual({
      configured: true,
      sent: true,
    });

    expect(sendEvent).toHaveBeenCalledWith({
      event: "session_completed",
      email: "joseph@example.com",
      payload: {
        CLIENT_NAME: "Joseph Todd",
        SESSION_NAME: "Session 4",
      },
    });
  });

  it("normalizes Intro Call to Session 1", async () => {
    await sendSessionCompletedEvent({
      name: "Sam",
      email: "sam@example.com",
      sessionNumber: 0,
    });

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          CLIENT_NAME: "Sam",
          SESSION_NAME: "Session 1",
        },
      }),
    );
  });
});
