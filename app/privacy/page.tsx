import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy — EliteSpeak",
  description:
    "How EliteSpeak handles your name, email, audio, and communication diagnosis data.",
};

const sections: { title: string; body: ReactNode }[] = [
  {
    title: "What we collect and why",
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-foreground">First name and email.</strong>{" "}
            Collected when you start a diagnosis so we can deliver your report and,
            if you opt in, follow up through our coaching program.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Audio you record or upload.</strong>{" "}
            Sent to our servers for analysis only when you submit a clip (typically
            30 seconds to 5 minutes). We do not keep the raw audio file in our
            database after processing.
          </li>
          <li>
            <strong className="font-semibold text-foreground">YouTube links (optional).</strong>{" "}
            If you paste a public YouTube URL, we fetch captions and/or audio through
            third-party services to run the same diagnosis. We do not scan pages you
            have not explicitly submitted.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Transcript and diagnosis.</strong>{" "}
            Generated from your audio or captions — scores, coaching text, and
            supporting notes that make up your report.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Anonymous browser ID.</strong>{" "}
            A random ID stored locally so we can apply fair daily usage limits. It is
            not tied to your name until you submit your email.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Report feedback (optional).</strong>{" "}
            A one-time 1–5 usefulness rating after you read your report (no comment
            field).
          </li>
          <li>
            <strong className="font-semibold text-foreground">IP address (temporary).</strong>{" "}
            Used only for short-term rate limiting on our servers. It is not stored
            in our analytics database.
          </li>
        </ul>
        <p className="mt-4">
          We do not collect browsing history, keystrokes, payment card details, or
          the contents of pages you visit outside what you submit for analysis.
        </p>
      </>
    ),
  },
  {
    title: "How data is used",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>To transcribe your speech and generate your communication diagnosis.</li>
        <li>To show, download, and optionally share your report.</li>
        <li>To sync your result to our email list / CRM when configured.</li>
        <li>To measure aggregate product quality (e.g. average CSAT scores in admin).</li>
        <li>To enforce soft daily usage limits and keep the free tool sustainable.</li>
      </ul>
    ),
  },
  {
    title: "Third-party processors",
    body: (
      <>
        <p className="mb-3">
          Each provider processes data only to deliver its part of the service:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-foreground">Google Gemini</strong> — speech
            transcription and AI diagnosis.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Convex</strong> — secure storage
            for analysis metadata, shared report links, and survey ratings.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Kartra</strong> — email list and
            lead follow-up (name, email, score summary, report link) when enabled.
          </li>
          <li>
            <strong className="font-semibold text-foreground">RapidAPI (YouTube MP3)</strong> —{" "}
            audio extraction for YouTube-based analyses.
          </li>
          <li>
            <strong className="font-semibold text-foreground">youtube-transcript.ai</strong> —{" "}
            public caption fetch for YouTube links.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Vercel</strong> — application
            hosting and server execution.
          </li>
        </ul>
        <p className="mt-4">
          We do not sell your data or share it with advertisers. We do not use
          third-party analytics or ad tracking pixels on the diagnosis app.
        </p>
      </>
    ),
  },
  {
    title: "Storage and retention",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="font-semibold text-foreground">Analysis records</strong> store
          scores and metadata (not raw audio). These remain until deleted by our team.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Shared report links</strong> remain
          available until you or we remove them.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Your browser</strong> may keep your
          report, name, and anonymous ID in local or session storage until you clear
          it or close the tab.
        </li>
        <li>
          <strong className="font-semibold text-foreground">PDF downloads</strong> are generated
          on your device; we do not upload them to our servers.
        </li>
      </ul>
    ),
  },
  {
    title: "Your choices",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          You can use the tool without sharing a YouTube link — record or upload
          audio instead.
        </li>
        <li>
          Report feedback is optional: tap 1–5 once, or close the popup to skip.
        </li>
        <li>
          Clear your browser storage to remove locally saved report data.
        </li>
        <li>
          To request deletion of data we hold (analysis record, shared link, or CRM
          entry), contact us through{" "}
          <a
            href="https://www.elitespeakprogram.com"
            className="font-semibold text-teal-700 underline-offset-2 hover:underline"
          >
            elitespeakprogram.com
          </a>
          .
        </li>
      </ul>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        Questions or data requests: reach us via{" "}
        <a
          href="https://www.elitespeakprogram.com"
          className="font-semibold text-teal-700 underline-offset-2 hover:underline"
        >
          www.elitespeakprogram.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">
          EliteSpeak
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted">Last updated: August 27, 2026</p>
        <p className="mt-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
          EliteSpeak provides a free AI communication diagnosis from a short audio
          clip or public YouTube link. This policy explains what we handle, why, and
          how long we keep it. It applies to{" "}
          <strong className="font-semibold text-foreground">app.elitespeakprogram.com</strong>{" "}
          and related report links.
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">
                {section.title}
              </h2>
              <div className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-border pt-8 text-center text-xs text-muted">
          <p>© {new Date().getFullYear()} EliteSpeak</p>
          <p className="mt-2">
            <Link
              href="/"
              className="font-semibold text-teal-700 hover:text-teal-900 hover:underline"
            >
              Back to diagnosis
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
