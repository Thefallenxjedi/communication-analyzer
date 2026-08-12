"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DiagnosisReport } from "@/lib/schema";
import { readLead, type LeadPayload } from "@/lib/lead";
import { getOrCreateAnonymousId } from "@/lib/anonymous-id";
import { pathToPhase, phaseToPath, type Phase } from "@/lib/funnel-routes";
import { LandingPage } from "@/components/LandingPage";
import { CapturePanel } from "@/components/CapturePanel";
import { AnalyzingState } from "@/components/AnalyzingState";
import { DiagnosisPage } from "@/components/DiagnosisPage";

const REPORT_STORAGE_KEY = "ca_report";

function readStoredReport(): DiagnosisReport | null {
  try {
    const raw = sessionStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiagnosisReport;
  } catch {
    return null;
  }
}

function storeReport(report: DiagnosisReport | null) {
  try {
    if (!report) sessionStorage.removeItem(REPORT_STORAGE_KEY);
    else sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report));
  } catch {
    // ignore
  }
}

export function FunnelApp() {
  const pathname = usePathname();
  const router = useRouter();
  const phase = pathToPhase(pathname);
  const bootstrapped = useRef(false);
  const analyzingRef = useRef(false);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [lead, setLead] = useState<LeadPayload | null>(null);
  const [serverHasDefault, setServerHasDefault] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const goTo = useCallback(
    (next: Phase, mode: "push" | "replace" = "push") => {
      const path = phaseToPath(next);
      if (path === pathname) return;
      if (mode === "replace") router.replace(path);
      else router.push(path);
    },
    [pathname, router],
  );

  // One-time hydrate. Refresh mid-funnel → home (audio/session can't resume).
  // Only /report stays if we still have a stored result.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const existing = readLead();
    const storedReport = readStoredReport();
    const path = pathname.replace(/\/$/, "") || "/";

    queueMicrotask(() => {
      if (existing) setLead(existing);
      if (storedReport) setReport(storedReport);
      setHydrated(true);

      // Results page: keep only when report is still in session
      if (path === "/report") {
        if (!storedReport) router.replace("/");
        return;
      }

      // Capture / analyzing / old start — refresh loses the in-progress flow
      if (
        path === "/capture" ||
        path === "/analyzing" ||
        path === "/start"
      ) {
        router.replace("/");
      }
    });
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: { hasServerKey?: boolean }) => {
        if (!cancelled) {
          setServerHasDefault(Boolean(data.hasServerKey));
          setConfigLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setConfigLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep-link #get-report → scroll to home form
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#get-report") return;
    const t = window.setTimeout(() => {
      document.getElementById("get-report")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [hydrated, pathname]);

  const goHome = () => {
    analyzingRef.current = false;
    setStatus("");
    setError("");
    setReport(null);
    storeReport(null);
    goTo("landing");
  };

  const startFunnel = () => {
    if (lead || readLead()) {
      goTo("capture");
      return;
    }
    if (pathname.replace(/\/$/, "") === "" || pathname === "/") {
      document.getElementById("get-report")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    router.replace("/#get-report");
  };

  const analyzeAudio = useCallback(
    async (audio: File, durationSec: number | null) => {
      analyzingRef.current = true;
      goTo("analyzing");
      setError("");
      setStatus("Understanding your speaking style…");

      const controller = new AbortController();
      // Hard stop so the UI never spins forever if the API hangs
      const timeoutMs = 100_000;
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const formData = new FormData();
        formData.append("audio", audio);
        formData.append("anonymousId", getOrCreateAnonymousId());
        if (durationSec != null && Number.isFinite(durationSec)) {
          formData.append("durationSec", String(Math.round(durationSec)));
        }
        const leadNow = lead || readLead();
        if (leadNow?.source) {
          formData.append("source", leadNow.source);
        }
        if (leadNow?.email) {
          formData.append("email", leadNow.email);
        }
        if (leadNow?.name) {
          formData.append(
            "firstName",
            leadNow.name.split(/\s+/)[0] || leadNow.name,
          );
        }

        setStatus("Building your personalized diagnosis…");
        const res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        let data: { error?: string } & Partial<DiagnosisReport> = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          throw new Error(
            "Analysis timed out or returned an invalid response. Please try again.",
          );
        }
        if (!res.ok) {
          throw new Error(
            data.error ||
              (res.status === 429
                ? "Our analysis service is busy right now. Please wait a moment and try again."
                : "Analysis failed."),
          );
        }

        const nextReport = data as DiagnosisReport;
        setReport(nextReport);
        storeReport(nextReport);
        analyzingRef.current = false;
        goTo("done");
      } catch (err) {
        analyzingRef.current = false;
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        setError(
          aborted
            ? "Analysis is taking too long. Please try again in a minute."
            : err instanceof Error
              ? err.message
              : "Something went wrong.",
        );
        setStatus("");
        goTo("capture");
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [goTo, lead],
  );

  if (!hydrated) {
    return <div className="app-shell" aria-busy="true" />;
  }

  const onLanding = phase === "landing" || phase === "name";

  return (
    <div className="app-shell">
      {phase === "done" && (
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-4">
          <button
            type="button"
            onClick={goHome}
            className="text-sm font-semibold text-accent hover:underline"
          >
            ← EliteSpeak Home
          </button>
        </div>
      )}

      {onLanding && (
        <LandingPage
          onCta={startFunnel}
          onLeadComplete={(next) => {
            setLead(next);
            goTo("capture");
          }}
        />
      )}

      {phase === "analyzing" && <AnalyzingState status={status} />}

      {phase === "done" && report && <DiagnosisPage report={report} />}

      {phase === "capture" && (
        <div>
          {error && (
            <div className="mx-auto max-w-3xl px-4 pt-4">
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            </div>
          )}
          {configLoaded && !serverHasDefault && (
            <div className="mx-auto max-w-3xl px-4 pt-4">
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Server API key is not configured. Set{" "}
                <code className="font-semibold">GOOGLE_GENERATIVE_AI_API_KEY</code>{" "}
                to run analysis.
              </p>
            </div>
          )}
          {lead?.name && (
            <p className="mx-auto max-w-3xl px-4 pt-4 text-center text-sm font-medium text-foreground">
              Hi {lead.name.split(" ")[0]} — let&apos;s diagnose your{" "}
              <span className="bg-highlight px-1 font-extrabold">
                communication
              </span>
              .
            </p>
          )}
          <CapturePanel
            onAudioReady={(file, durationSec) =>
              void analyzeAudio(file, durationSec)
            }
            onError={setError}
            disabled={!serverHasDefault}
          />
        </div>
      )}

      {phase !== "landing" && phase !== "name" && (
        <footer className="border-t border-border py-8 text-center text-xs text-muted">
          EliteSpeak · Free communication diagnosis
        </footer>
      )}
    </div>
  );
}
