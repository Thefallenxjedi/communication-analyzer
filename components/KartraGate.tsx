"use client";

import Image from "next/image";
import Script from "next/script";
import { useEffect, useState } from "react";

/** Kartra simplified opt-in — empty container + single script. */
const KARTRA_CONTAINER_CLASS =
  "kartra_optin_containerc20ad4d76fe97759aa27a0c99bff6710";
const KARTRA_OPTIN_SRC = "https://app.kartra.com/optin/fMPOVao42jZa";
const KARTRA_SCRIPT_ID = "kartra-optin-fMPOVao42jZa";

const PREVIEW_CARDS = [
  { src: "/challenges/rambling.png", label: "Rambling", rotate: -6 },
  { src: "/challenges/confidence.png", label: "Confidence", rotate: 0 },
  { src: "/challenges/clarity.png", label: "Clarity", rotate: 6 },
] as const;

type KartraGateProps = {
  onBack?: () => void;
};

function removeKartraScript() {
  if (typeof document === "undefined") return;
  document.getElementById(KARTRA_SCRIPT_ID)?.remove();
  document
    .querySelectorAll(`script[src="${KARTRA_OPTIN_SRC}"]`)
    .forEach((el) => el.remove());
}

export function KartraGate({ onBack }: KartraGateProps) {
  // Gate Script until mount so Strict Mode / remounts can re-inject after cleanup
  const [ready, setReady] = useState(false);

  useEffect(() => {
    removeKartraScript();
    setReady(true);
    return () => {
      setReady(false);
      removeKartraScript();
    };
  }, []);

  return (
    <section className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center px-4 py-12 animate-fade-up">
      <h1 className="text-center text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
        Get your free personalized communication diagnosis
      </h1>
      <p className="mt-3 text-center text-sm text-muted">
        Takes under a minute to start. Audio only — 30 seconds to 2 minutes.
      </p>

      <div className="mt-8 flex justify-center gap-2 overflow-hidden px-2">
        {PREVIEW_CARDS.map((card, i) => (
          <div
            key={card.label}
            className={`relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:h-36 sm:w-28 ${
              i === 1 ? "z-10 scale-105 border-accent/40 shadow-md" : "opacity-80"
            }`}
            style={{ transform: `rotate(${card.rotate}deg)` }}
          >
            <Image
              src={card.src}
              alt={card.label}
              fill
              className="object-cover object-center"
              sizes="112px"
            />
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-base font-semibold">
        What&apos;s your <span className="font-extrabold">name</span>?
      </p>

      <div className={`${KARTRA_CONTAINER_CLASS} kartra-gate mt-4`} />

      <p className="mt-4 text-center text-xs text-muted">
        After submit you&apos;ll continue to the assessment
      </p>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          ← Back
        </button>
      )}

      {ready && (
        <Script
          id={KARTRA_SCRIPT_ID}
          src={KARTRA_OPTIN_SRC}
          strategy="afterInteractive"
        />
      )}
    </section>
  );
}
