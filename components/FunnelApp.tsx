"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DiagnosisReport } from "@/lib/schema";
import { readLead, saveKartraLead, type LeadPayload } from "@/lib/lead";
import { pathToPhase, phaseToPath, type Phase } from "@/lib/funnel-routes";
import { LandingPage } from "@/components/LandingPage";
import { KartraGate } from "@/components/KartraGate";
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
  const searchParams = useSearchParams();
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

  // One-time hydrate + deep-link / Kartra redirect handling
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const step = searchParams.get("step") ?? searchParams.get("phase");
    const existing = step === "capture" ? saveKartraLead() : readLead();
    const storedReport = readStoredReport();
    const path = pathname.replace(/\/$/, "") || "/";

    queueMicrotask(() => {
      if (existing) setLead(existing);
      if (storedReport) setReport(storedReport);
      setHydrated(true);

      if (step === "capture") {
        router.replace("/capture");
        return;
      }

      if (path === "/report" && !storedReport) {
        router.replace(existing ? "/capture" : "/start");
        return;
      }

      // Refresh mid-analysis → back to capture (can't resume the request)
      if (path === "/analyzing" && !analyzingRef.current) {
        router.replace(existing ? "/capture" : "/start");
      }
    });
  }, [pathname, router, searchParams]);

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

  const goHome = () => {
    analyzingRef.current = false;
    setStatus("");
    setError("");
    setReport(null);
    storeReport(null);
    goTo("landing");
  };

  const startFunnel = () => {
    if (lead || readLead()) goTo("capture");
    else goTo("name");
  };

  const analyzeAudio = useCallback(
    async (audio: File) => {
      analyzingRef.current = true;
      goTo("analyzing");
      setError("");
      setStatus("Understanding your speaking style…");

      try {
        const formData = new FormData();
        formData.append("audio", audio);

        setStatus("Building your personalized diagnosis…");
        const res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed.");

        const nextReport = data as DiagnosisReport;
        setReport(nextReport);
        storeReport(nextReport);
        analyzingRef.current = false;
        goTo("done");
      } catch (err) {
        analyzingRef.current = false;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("");
        goTo("capture");
      }
    },
    [goTo],
  );

  if (!hydrated) {
    return <div className="app-shell" aria-busy="true" />;
  }

  return (
    <div className="app-shell">
      {phase !== "landing" && (
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

      {phase === "landing" && <LandingPage onCta={startFunnel} />}

      {phase === "name" && <KartraGate onBack={goHome} />}

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
            <p className="mx-auto max-w-3xl px-4 pt-4 text-center text-sm text-muted">
              Hi {lead.name.split(" ")[0]} — let&apos;s diagnose your
              communication.
            </p>
          )}
          <CapturePanel
            onAudioReady={(file) => void analyzeAudio(file)}
            onError={setError}
            disabled={!serverHasDefault}
          />
        </div>
      )}

      {phase !== "landing" && (
        <footer className="border-t border-border py-8 text-center text-xs text-muted">
          EliteSpeak · Free communication diagnosis · Max 4 minutes
        </footer>
      )}
    </div>
  );
}
