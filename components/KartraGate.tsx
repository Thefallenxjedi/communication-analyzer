"use client";

import Image from "next/image";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const FORM_ID = "d3d9446802a44259755d38e6d163e820";
const OPTIN_HASH = "4eROViFLBIYf";
const OWNER_ID = "Lk94O8jg";

const JQUERY_SRC =
  "https://app.kartra.com/js/node_modules/kartra-jquery/jquery-1.11.3/jquery-1.11.3.min.js";
const ANALYTICS_SRC = `https://app.kartra.com/resources/js/analytics/${OWNER_ID}`;
const OPTIN_SRC = `https://app.kartra.com/resources/js/optin_front_javascript?form_id=${FORM_ID}&optin_hash=${OPTIN_HASH}&khoi=${OWNER_ID}`;
const SANITATION_SRC = "https://app.kartra.com/js/santitation.js";

/** Form markup only — scripts load via next/script. */
const KARTRA_FORM_HTML = `
<div class="form_class_${FORM_ID}" data-form_id="${FORM_ID}">
  <form method="post" action="https://app.kartra.com/process/add_lead/${OPTIN_HASH}" target="_top" class="form_class_${OPTIN_HASH} js_kartra_trackable_object" data-kt-type="optin" data-kt-value="${OPTIN_HASH}" data-kt-owner="${OWNER_ID}" accept-charset="UTF-8">
    <input type="text" class="" placeholder="" name="aaddress_url" value="" style="display: none; position: absolute; left: -9999px;" aria-hidden="true" tabindex="-1">
    <input type="text" class="js_kartra_santitation" data-santitation-type="front_name" placeholder="First name..." name="first_name" value="">
    <input type="text" class="js_kartra_santitation" data-santitation-type="email" placeholder="Email..." name="email" value="">
    <div class="js_captcha_wrapper"></div>
    <button class="submit_button_${FORM_ID}" type="submit">Submit</button>
  </form>
</div>
`.trim();

const PREVIEW_CARDS = [
  { src: "/challenges/rambling.png", label: "Rambling", rotate: -6 },
  { src: "/challenges/confidence.png", label: "Confidence", rotate: 0 },
  { src: "/challenges/clarity.png", label: "Clarity", rotate: 6 },
] as const;

type KartraGateProps = {
  onBack?: () => void;
};

declare global {
  interface Window {
    jQuery?: unknown;
    jsVars?: Record<string, unknown>;
    kartra_checkout_jquery?: unknown;
  }
}

export function KartraGate({ onBack }: KartraGateProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [jqueryReady, setJqueryReady] = useState(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [optinReady, setOptinReady] = useState(false);

  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    el.innerHTML = KARTRA_FORM_HTML;
  }, []);

  return (
    <section className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center px-4 py-12 animate-fade-up">
      <h1 className="text-center text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
        Get your free personalized communication diagnosis
      </h1>
      <p className="mt-3 text-center text-sm text-muted">
        Takes under a minute to start. Audio only — up to 4 minutes.
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

      <div ref={formRef} className="kartra-gate-form mt-4" />

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

      <Script
        id="kartra-jquery"
        src={JQUERY_SRC}
        strategy="afterInteractive"
        onLoad={() => setJqueryReady(true)}
        onReady={() => {
          if (typeof window !== "undefined" && window.jQuery) {
            setJqueryReady(true);
          }
        }}
      />

      {jqueryReady && (
        <Script
          id="kartra-analytics"
          src={ANALYTICS_SRC}
          strategy="afterInteractive"
          onLoad={() => setAnalyticsReady(true)}
        />
      )}

      {analyticsReady && (
        <Script
          id="kartra-optin"
          src={OPTIN_SRC}
          strategy="afterInteractive"
          onLoad={() => setOptinReady(true)}
        />
      )}

      {optinReady && (
        <>
          <Script
            id="kartra-jsvars"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.jsVars = window.jsVars || {};
                if (window.jQuery) {
                  window.kartra_checkout_jquery = window.jQuery;
                }
              `,
            }}
          />
          <Script
            id="kartra-sanitation"
            src={SANITATION_SRC}
            strategy="afterInteractive"
          />
        </>
      )}
    </section>
  );
}
