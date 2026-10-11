"use client";

import posthog from "posthog-js";

function posthogReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
}

type PersonProperties = {
  email?: string;
  name?: string;
  role: string;
};

/**
 * Identifies the current browser as `distinctId`.
 * An anonymous visitor is merged into that person.
 * A browser already identified as someone else is reset first, so two emails
 * or a visitor and a coaching account stay separate people.
 */
export function identifyPostHogPerson(
  distinctId: string,
  properties: PersonProperties,
) {
  if (!posthogReady()) return;
  const id = distinctId.trim();
  if (!id) return;

  const currentId = posthog.get_distinct_id();
  if (posthog.get_property("$user_state") === "identified" && currentId !== id) {
    posthog.reset();
  }
  posthog.identify(id, properties);
}

/** Free-tool lead. The PostHog user id is the email address. */
export function identifyVisitorLead(input: { email: string; name: string }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) return;
  identifyPostHogPerson(email, {
    email,
    name,
    role: "visitor",
  });
}
