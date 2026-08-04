"use client";

import { useCallback, useEffect, useState } from "react";
import type { DiagnosisReport } from "@/lib/schema";
import { LandingPage } from "@/components/LandingPage";
import { NameGate, readLead, type LeadPayload } from "@/components/NameGate";
import { CapturePanel } from "@/components/CapturePanel";
import { AnalyzingState } from "@/components/AnalyzingState";
import { DiagnosisPage } from "@/components/DiagnosisPage";

type Phase = "landing" | "name" | "capture" | "analyzing" | "done";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [lead, setLead] = useState<LeadPayload | null>(null);
  const [serverHasDefault, setServerHasDefault] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Restore lead if present, but always stay on landing until CTA
  useEffect(() => {
    const existing = readLead();
    if (existing) setLead(existing);
  }, []);

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
    setPhase("landing");
    setStatus("");
    setError("");
    setReport(null);
  };

  const startFunnel = () => {
    // Skip name step if we already have a valid lead this session
    if (lead) setPhase("capture");
    else setPhase("name");
  };

  const reset = () => {
    setPhase("capture");
    setStatus("");
    setError("");
    setReport(null);
  };

  const analyzeAudio = useCallback(async (audio: File) => {
    setPhase("analyzing");
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

      setReport(data as DiagnosisReport);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("capture");
      setStatus("");
    }
  }, []);

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

      {phase === "name" && (
        <NameGate
          onComplete={(l) => {
            setLead(l);
            setPhase("capture");
          }}
          onBack={goHome}
        />
      )}

      {phase === "analyzing" && <AnalyzingState status={status} />}

      {phase === "done" && report && (
        <DiagnosisPage report={report} onReset={reset} />
      )}

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
              Hi {lead.name.split(" ")[0]} — let&apos;s diagnose your communication.
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
