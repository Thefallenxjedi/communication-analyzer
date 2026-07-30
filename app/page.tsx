"use client";

import { useCallback, useEffect, useState } from "react";
import type { EliteSpeakReport } from "@/lib/schema";
import type { PreparedMedia } from "@/components/UploadZone";
import { LandingPage } from "@/components/LandingPage";
import { LeadForm, readLead, type LeadPayload } from "@/components/LeadForm";
import { InputPanel } from "@/components/InputPanel";
import { AnalyzingState } from "@/components/AnalyzingState";
import { ReportDashboard } from "@/components/ReportDashboard";

type FunnelPhase =
  | "landing"
  | "lead"
  | "analyze"
  | "preparing"
  | "analyzing"
  | "done";

export default function Home() {
  const [phase, setPhase] = useState<FunnelPhase>("landing");
  const [status, setStatus] = useState("Waiting for input…");
  const [error, setError] = useState("");
  const [report, setReport] = useState<EliteSpeakReport | null>(null);
  const [serverHasDefault, setServerHasDefault] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const existing = readLead();
    if (existing) setPhase("analyze");
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

  const onLeadComplete = (_lead: LeadPayload) => {
    setPhase("analyze");
    setError("");
  };

  const reset = () => {
    setPhase("analyze");
    setStatus("Waiting for input…");
    setError("");
    setReport(null);
  };

  const analyzeMedia = useCallback(async (media: PreparedMedia) => {
    setPhase("analyzing");
    setError("");
    setStatus(
      media.fromVideo
        ? "Running EliteSpeak multimodal analysis…"
        : "Transcribing and scoring 20 EliteSpeak markers…",
    );

    try {
      const formData = new FormData();
      formData.append("audio", media.audio);
      media.frames?.forEach((frame, i) => {
        formData.append(`frame${i}`, frame);
      });

      setStatus("Scoring 20 communication markers…");
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");

      setReport(data as EliteSpeakReport);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("analyze");
      setStatus("Ready to try again");
    }
  }, []);

  const analyzeText = useCallback(async (transcript: string) => {
    setPhase("analyzing");
    setError("");
    setStatus("Scoring EliteSpeak markers from text…");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setReport(data as EliteSpeakReport);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("analyze");
      setStatus("Ready to try again");
    }
  }, []);

  const analyzeYouTube = useCallback(async (youtubeUrl: string) => {
    setPhase("analyzing");
    setError("");
    setStatus("Fetching & analyzing YouTube video (first ~4 minutes)…");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setReport(data as EliteSpeakReport);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("analyze");
      setStatus("Ready to try again");
    }
  }, []);

  return (
    <div className="app-atmosphere min-h-screen">
      {phase === "landing" && (
        <LandingPage onCta={() => setPhase("lead")} />
      )}

      {phase === "lead" && (
        <LeadForm
          onComplete={onLeadComplete}
          onBack={() => setPhase("landing")}
        />
      )}

      {(phase === "analyzing" || phase === "preparing") && (
        <AnalyzingState
          status={status}
          mode={phase === "preparing" ? "preparing" : "analyzing"}
        />
      )}

      {phase === "done" && report && (
        <ReportDashboard report={report} onReset={reset} />
      )}

      {phase === "analyze" && (
        <div>
          {error && (
            <div className="mx-auto max-w-5xl px-6 pb-4 pt-8">
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            </div>
          )}
          {configLoaded && !serverHasDefault && (
            <div className="mx-auto max-w-5xl px-6 pb-4 pt-8">
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Server API key is not configured. Set{" "}
                <code className="text-neon">GOOGLE_GENERATIVE_AI_API_KEY</code>{" "}
                on the server to run analysis.
              </p>
            </div>
          )}
          <div className="pt-10">
            <InputPanel
              onMediaReady={(media) => void analyzeMedia(media)}
              onTextReady={(text) => void analyzeText(text)}
              onYouTubeReady={(url) => void analyzeYouTube(url)}
              onStatus={(s) => {
                setStatus(s);
                if (
                  /FFmpeg|Extracting|Preparing|Writing|Loading|Checking|Capturing|analyzing the first/i.test(
                    s,
                  )
                ) {
                  setPhase("preparing");
                }
              }}
              onError={(message) => {
                setError(message);
                if (message) setPhase("analyze");
              }}
              disabled={!serverHasDefault}
            />
          </div>
        </div>
      )}

      {phase !== "landing" && (
        <footer className="border-t border-border py-8 text-center text-xs text-zinc-500">
          Free communication analysis report · EliteSpeak-style 20 markers · Max
          4 minutes processed
        </footer>
      )}
    </div>
  );
}
