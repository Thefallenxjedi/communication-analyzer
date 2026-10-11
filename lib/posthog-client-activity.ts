import { PostHog } from "posthog-node";

type ClientPerson = {
  email?: string;
  name?: string;
  role?: string;
};

type ClientActivity = {
  distinctId: string;
  event: string;
  properties?: Record<string, string | number | boolean>;
  person?: ClientPerson;
};

function posthogClient(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (!token || !host) return null;
  return new PostHog(token, { host, flushAt: 1, flushInterval: 0 });
}

/**
 * Records an event on the coaching client's PostHog person, not the coach's browser.
 * Sets email and name so the person exists before the client opens the portal.
 */
export async function captureClientActivity(input: ClientActivity): Promise<void> {
  const distinctId = input.distinctId.trim();
  if (!distinctId) return;
  const posthog = posthogClient();
  if (!posthog) return;

  try {
    const email = input.person?.email?.trim().toLowerCase();
    const name = input.person?.name?.trim();
    if (email || name) {
      await posthog.identifyImmediate({
        distinctId,
        properties: {
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
          role: input.person?.role || "client",
        },
      });
    }
    await posthog.captureImmediate({
      distinctId,
      event: input.event,
      properties: input.properties,
    });
  } catch (err) {
    console.error("[posthog] client activity capture failed", err);
  } finally {
    await posthog._shutdown().catch(() => undefined);
  }
}
