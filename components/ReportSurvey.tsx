"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getOrCreateAnonymousId } from "@/lib/anonymous-id";

type ReportSurveyProps = {
  reportSlug?: string;
};

function storageKey(slug: string) {
  return `ca_survey_${slug}`;
}

export function ReportSurvey({ reportSlug: reportSlugProp }: ReportSurveyProps) {
  const pathname = usePathname();
  const pathSlug = pathname?.match(/^\/r\/([a-z0-9]+)/i)?.[1];
  const [sessionSlug, setSessionSlug] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!reportSlugProp?.trim()) {
      setSessionSlug(readShareSlugFromSession() || pathSlug);
    }
  }, [reportSlugProp, pathSlug]);

  const slug = (reportSlugProp || sessionSlug || pathSlug || "")
    .trim()
    .toLowerCase()
    .slice(0, 32);
  const [hidden, setHidden] = useState(true);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setHidden(true);
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      if (localStorage.getItem(storageKey(slug)) === "1") {
        setHidden(true);
        setChecking(false);
        return;
      }
    } catch {
      // ignore
    }

    setHidden(false);

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/survey?reportSlug=${encodeURIComponent(slug)}`,
        );
        const data = (await res.json()) as { rated?: boolean };
        if (!cancelled && data.rated) {
          try {
            localStorage.setItem(storageKey(slug), "1");
          } catch {
            // ignore
          }
          setHidden(true);
        }
      } catch {
        // keep showing survey if check fails
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const dismiss = useCallback(() => {
    if (!slug) return;
    try {
      localStorage.setItem(storageKey(slug), "1");
    } catch {
      // ignore
    }
    setHidden(true);
  }, [slug]);

  const submitRating = useCallback(
    async (rating: number) => {
      if (!slug || busy || done) return;
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            anonymousId: getOrCreateAnonymousId(),
            reportSlug: slug,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          alreadyRated?: boolean;
          error?: string;
        };
        if (!res.ok && !data.alreadyRated) {
          throw new Error(data.error || "Could not save your rating.");
        }
        try {
          localStorage.setItem(storageKey(slug), "1");
        } catch {
          // ignore
        }
        setDone(true);
        window.setTimeout(() => setHidden(true), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [slug, busy, done],
  );

  if (!mounted || hidden || checking || !slug) return null;

  return createPortal(
    <>
      {/* Desktop: fixed top-right */}
      <div
        role="dialog"
        aria-label="Report feedback"
        className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[60] hidden w-[min(100%,28rem)] animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-lg ring-1 ring-black/5 md:block"
      >
        <SurveyCardBody
          variant="desktop"
          done={done}
          busy={busy}
          error={error}
          onDismiss={dismiss}
          onRate={(n) => void submitRating(n)}
        />
      </div>

      {/* Mobile: fixed bottom sheet */}
      <div
        role="dialog"
        aria-label="Report feedback"
        className="fixed inset-x-0 bottom-0 z-[60] animate-fade-up border-t border-border bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:hidden"
      >
        <SurveyCardBody
          variant="mobile"
          done={done}
          busy={busy}
          error={error}
          onDismiss={dismiss}
          onRate={(n) => void submitRating(n)}
        />
      </div>
    </>,
    document.body,
  );
}

function SurveyCardBody({
  variant,
  done,
  busy,
  error,
  onDismiss,
  onRate,
}: {
  variant: "desktop" | "mobile";
  done: boolean;
  busy: boolean;
  error: string;
  onDismiss: () => void;
  onRate: (n: number) => void;
}) {
  const isDesktop = variant === "desktop";

  return (
    <div className="relative">
      {!done ? (
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className={`absolute flex items-center justify-center rounded-full text-muted transition hover:bg-track hover:text-foreground ${
            isDesktop
              ? "-right-2 -top-2 h-9 w-9"
              : "-right-1 -top-1 h-8 w-8"
          }`}
          aria-label="Close feedback"
        >
          <span className="text-lg leading-none" aria-hidden>×</span>
        </button>
      ) : null}

      {done ? (
        <p
          className={`py-1 text-center font-semibold text-foreground ${
            isDesktop ? "text-base" : "text-sm"
          }`}
        >
          Thanks!
        </p>
      ) : (
        <>
          <h2
            className={`pr-6 font-extrabold tracking-tight text-foreground ${
              isDesktop ? "text-lg" : "text-base"
            }`}
          >
            Was this report useful?
          </h2>
          <div
            className={`flex justify-between gap-2 ${
              isDesktop ? "mt-4 gap-2.5" : "mt-3 gap-1.5"
            }`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => onRate(n)}
                className={`flex min-w-0 flex-1 items-center justify-center rounded-full border border-border bg-track/50 font-extrabold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:opacity-55 ${
                  isDesktop
                    ? "h-12 text-lg"
                    : "h-11 text-sm"
                }`}
                aria-label={`Rate ${n} out of 5`}
              >
                {n}
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-2 text-xs font-semibold text-accent">{error}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Read share slug from session when DiagnosisPage has no sharePath. */
export function readShareSlugFromSession(): string | undefined {
  try {
    const raw = sessionStorage.getItem("ca_share_meta");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { slug?: string; path?: string };
    const fromSlug = parsed.slug?.trim().toLowerCase().slice(0, 32);
    if (fromSlug) return fromSlug;
    const path = parsed.path?.trim() || "";
    if (path.startsWith("/r/")) {
      return path.slice(3).split(/[/?#]/)[0]?.trim().toLowerCase().slice(0, 32);
    }
  } catch {
    // ignore
  }
  return undefined;
}
