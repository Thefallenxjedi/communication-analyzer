"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/** Kartra simplified opt-in — empty container + single script. */
export const KARTRA_CONTAINER_CLASS =
  "kartra_optin_containerc20ad4d76fe97759aa27a0c99bff6710";
export const KARTRA_OPTIN_SRC = "https://app.kartra.com/optin/fMPOVao42jZa";
const KARTRA_SCRIPT_ID = "kartra-optin-fMPOVao42jZa";

function removeKartraScript() {
  if (typeof document === "undefined") return;
  document.getElementById(KARTRA_SCRIPT_ID)?.remove();
  document
    .querySelectorAll(`script[src="${KARTRA_OPTIN_SRC}"]`)
    .forEach((el) => el.remove());
}

type KartraOptInProps = {
  className?: string;
};

export function KartraOptIn({ className = "" }: KartraOptInProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    removeKartraScript();
    const id = window.setTimeout(() => setReady(true), 0);
    return () => {
      window.clearTimeout(id);
      setReady(false);
      removeKartraScript();
    };
  }, []);

  return (
    <div className={className}>
      <div className={`${KARTRA_CONTAINER_CLASS} kartra-gate`} />
      {ready ? (
        <Script
          id={KARTRA_SCRIPT_ID}
          src={KARTRA_OPTIN_SRC}
          strategy="afterInteractive"
        />
      ) : null}
    </div>
  );
}
