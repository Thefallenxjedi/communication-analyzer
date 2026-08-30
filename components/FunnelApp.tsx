"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DiagnosisReport } from "@/lib/schema";
import { readLead, type LeadPayload } from "@/lib/lead";
import { getOrCreateAnonymousId } from "@/lib/anonymous-id";
import type { CaptureMethod } from "@/lib/capture-method";
import { pathToPhase, phaseToPath, type Phase } from "@/lib/funnel-routes";
import {
  clearFailure,
  readFailure,
  storeFailure,
} from "@/lib/failure-state";
import { LandingPage } from "@/components/LandingPage";
import { CapturePanel } from "@/components/CapturePanel";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalyzingState } from "@/components/AnalyzingState";
import { AnalyzeFailed } from "@/components/AnalyzeFailed";
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
  const [lastAudio, setLastAudio] = useState<File | null>(null);
  const [lastPromptQuestion, setLastPromptQuestion] = useState<string | null>(
    null,
  );
  const [lastDurationSec, setLastDurationSec] = useState<number | null>(null);
  const [lastYoutubeUrl, setLastYoutubeUrl] = useState<string | null>(null);
  const [lastCaptureMethod, setLastCaptureMethod] =
    useState<CaptureMethod>("upload");
  const [retryWaitSec, setRetryWaitSec] = useState(0);

  const goTo = useCallback(
    (next: Phase, mode: "push" | "replace" = "push") => {
      const path = phaseToPath(next);
      if (path === pathname) return;
      if (mode === "replace") router.replace(path);
      else router.push(path);
    },
    [pathname, router],
  );

  const showFailure = useCallback(
    (
      message: string,
      opts: {
        retryWaitSec: number;
        lastYoutubeUrl?: string | null;
        lastDurationSec?: number | null;
        lastCaptureMethod?: CaptureMethod;
      },
    ) => {
      const yt = opts.lastYoutubeUrl ?? lastYoutubeUrl;
      const dur = opts.lastDurationSec ?? lastDurationSec;
      const method = opts.lastCaptureMethod ?? lastCaptureMethod;
      setError(message);
      setRetryWaitSec(opts.retryWaitSec);
      setStatus("");
      storeFailure({
        message,
        lastYoutubeUrl: yt,
        lastDurationSec: dur,
        lastCaptureMethod: method,
        retryWaitSec: opts.retryWaitSec,
      });
      goTo("failed", "replace");
    },
    [goTo, lastCaptureMethod, lastDurationSec, lastYoutubeUrl],
  );

  useEffect(() => {
    if (phase === "done") window.scrollTo(0, 0);
  }, [phase]);

  // One-time hydrate. Refresh mid-funnel → home (audio/session can't resume).
  // Only /report stays if we still have a stored result.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const existing = readLead();
    const storedReport = readStoredReport();
    const storedFailure = readFailure();
    const path = pathname.replace(/\/$/, "") || "/";

    queueMicrotask(() => {
      if (existing) setLead(existing);
      if (storedReport) setReport(storedReport);

      if (path === "/failed") {
        if (storedFailure) {
          setError(storedFailure.message);
          setLastYoutubeUrl(storedFailure.lastYoutubeUrl);
          setLastDurationSec(storedFailure.lastDurationSec);
          setLastCaptureMethod(storedFailure.lastCaptureMethod);
          setRetryWaitSec(storedFailure.retryWaitSec);
        } else {
          router.replace("/");
        }
        setHydrated(true);
        return;
      }

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
    clearFailure();
    setLastAudio(null);
    setLastPromptQuestion(null);
    setLastDurationSec(null);
    setLastYoutubeUrl(null);
    setLastCaptureMethod("upload");
    setRetryWaitSec(0);
    goTo("landing");
  };

  const startNewClip = () => {
    analyzingRef.current = false;
    setError("");
    clearFailure();
    setLastAudio(null);
    setLastPromptQuestion(null);
    setLastDurationSec(null);
    setLastYoutubeUrl(null);
    setLastCaptureMethod("upload");
    setRetryWaitSec(0);
    goTo("capture");
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
    async (
      audio: File,
      durationSec: number | null,
      promptQuestion?: string | null,
      captureMethod: CaptureMethod = "upload",
    ) => {
      if (analyzingRef.current) return;
      analyzingRef.current = true;
      setLastAudio(audio);
      setLastDurationSec(durationSec);
      setLastCaptureMethod(captureMethod);
      const prompt =
        (promptQuestion ?? lastPromptQuestion)?.trim() || "";
      setLastPromptQuestion(prompt || null);
      setRetryWaitSec(0);
      goTo("analyzing");
      setError("");
      setStatus("Understanding your speaking style…");

      const controller = new AbortController();
      // Align with server maxDuration (300s); leave a small buffer for the response
      const timeoutMs = 290_000;
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const formData = new FormData();
        formData.append("audio", audio);
        formData.append("anonymousId", getOrCreateAnonymousId());
        formData.append("captureMethod", captureMethod);
        if (durationSec != null && Number.isFinite(durationSec)) {
          formData.append("durationSec", String(Math.round(durationSec)));
        }
        if (prompt) {
          formData.append("promptQuestion", prompt.slice(0, 500));
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

        let data: {
          error?: string;
          shareSlug?: string;
          sharePath?: string;
        } & Partial<DiagnosisReport> = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          throw new Error(
            "Analysis timed out or returned an invalid response. Please try again.",
          );
        }
        if (!res.ok) {
          const busy = res.status === 429;
          const err = new Error(
            data.error ||
              (busy
                ? "Our analysis service is busy right now. Please wait a moment and try again."
                : "Analysis failed."),
          );
          (err as Error & { retryAfterSec?: number }).retryAfterSec = busy
            ? 60
            : 8;
          throw err;
        }

        const { shareSlug, sharePath, ...reportFields } = data;
        const nextReport = reportFields as DiagnosisReport;
        setReport(nextReport);
        storeReport(nextReport);
        clearFailure();
        setLastAudio(null);
        setLastDurationSec(null);
        analyzingRef.current = false;

        if (shareSlug) {
          try {
            sessionStorage.setItem(
              "ca_share_meta",
              JSON.stringify({
                slug: shareSlug,
                path: sharePath || `/r/${shareSlug}`,
              }),
            );
          } catch {
            /* ignore */
          }
          router.replace(`/r/${shareSlug}`);
        } else {
          goTo("done");
        }

        // Backup Kartra sync (analyze already schedules after(); this covers timeouts)
        const syncLead = leadNow || lead || readLead();
        if (syncLead?.email) {
          void fetch("/api/kartra-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: syncLead.email,
              firstName:
                (syncLead.name || "Friend").split(/\s+/)[0] || "Friend",
              shareSlug,
              sharePath,
              report: {
                overallScore: nextReport.overallScore,
                level: nextReport.level,
                mainChallenge: {
                  title: nextReport.mainChallenge?.title || "",
                  strengths: nextReport.mainChallenge?.strengths,
                  improvements: nextReport.mainChallenge?.improvements,
                },
              },
            }),
            keepalive: true,
          }).catch(() => {
            /* non-blocking */
          });
        }
      } catch (err) {
        analyzingRef.current = false;
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        const retryFromErr =
          err instanceof Error
            ? (err as Error & { retryAfterSec?: number }).retryAfterSec
            : undefined;
        const message = aborted
          ? "This is taking longer than expected on our end. Please wait about a minute and try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong on our end. Please wait about a minute and try again.";
        const busy =
          aborted ||
          /busy|wait about a minute|try again later|quota|rate limit/i.test(
            message,
          );
        const waitSec =
          typeof retryFromErr === "number" ? retryFromErr : busy ? 60 : 8;
        showFailure(message, {
          retryWaitSec: waitSec,
          lastYoutubeUrl: null,
          lastDurationSec: durationSec,
          lastCaptureMethod: captureMethod,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [goTo, lastPromptQuestion, lead, router, showFailure],
  );

  const analyzeYoutube = useCallback(
    async (url: string) => {
      if (analyzingRef.current) return;
      analyzingRef.current = true;
      setLastYoutubeUrl(url);
      setLastCaptureMethod("youtube");
      setLastAudio(null);
      setRetryWaitSec(0);
      goTo("analyzing");
      setError("");

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 290_000);
      let diagnosisStatusId: number | undefined;

      try {
        const leadNow = lead || readLead();
        setStatus("Fetching YouTube transcript and audio…");

        diagnosisStatusId = window.setTimeout(() => {
          setStatus("Building your personalized diagnosis…");
        }, 90_000);

        const res = await fetch("/api/youtube-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            anonymousId: getOrCreateAnonymousId(),
            email: leadNow?.email || undefined,
            firstName: leadNow?.name
              ? leadNow.name.split(/\s+/)[0] || leadNow.name
              : undefined,
            promptQuestion: lastPromptQuestion || undefined,
          }),
          signal: controller.signal,
        });

        let data: {
          error?: string;
          shareSlug?: string;
          sharePath?: string;
          durationSec?: number;
        } & Partial<DiagnosisReport> = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          throw new Error(
            "Analysis timed out or returned an invalid response. Please try again.",
          );
        }

        if (res.status === 503) {
          setStatus("Pulling the YouTube transcript…");
          const trRes = await fetch("/api/youtube-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url,
              anonymousId: getOrCreateAnonymousId(),
              email: leadNow?.email || undefined,
              firstName: leadNow?.name
                ? leadNow.name.split(/\s+/)[0] || leadNow.name
                : undefined,
            }),
            signal: controller.signal,
          });
          const trData = (await trRes.json()) as {
            error?: string;
            transcript?: string;
            durationSec?: number | null;
          };
          if (!trRes.ok || !trData.transcript) {
            throw new Error(
              trData.error || "Could not read that YouTube video.",
            );
          }

          setStatus("Building your personalized diagnosis…");
          const formData = new FormData();
          formData.append("transcript", trData.transcript);
          formData.append("anonymousId", getOrCreateAnonymousId());
          formData.append("captureMethod", "youtube");
          formData.append("source", "youtube");
          if (trData.durationSec != null) {
            formData.append(
              "durationSec",
              String(Math.round(trData.durationSec)),
            );
            setLastDurationSec(Math.round(trData.durationSec));
          }
          if (leadNow?.email) formData.append("email", leadNow.email);
          if (leadNow?.name) {
            formData.append(
              "firstName",
              leadNow.name.split(/\s+/)[0] || leadNow.name,
            );
          }
          if (lastPromptQuestion) {
            formData.append("promptQuestion", lastPromptQuestion);
          }

          const fallbackRes = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          data = (await fallbackRes.json()) as typeof data;
          if (!fallbackRes.ok) {
            const busy = fallbackRes.status === 429;
            throw new Error(
              data.error ||
                (busy
                  ? "Our analysis service is busy right now. Please wait a moment and try again."
                  : "Analysis failed."),
            );
          }
        } else if (!res.ok) {
          const busy = res.status === 429;
          const err = new Error(
            data.error ||
              (busy
                ? "Our analysis service is busy right now. Please wait a moment and try again."
                : "Analysis failed."),
          );
          (err as Error & { retryAfterSec?: number }).retryAfterSec = busy
            ? 60
            : 8;
          throw err;
        }

        const { shareSlug, sharePath, ...reportFields } = data;
        const nextReport = reportFields as DiagnosisReport;
        setReport(nextReport);
        storeReport(nextReport);
        clearFailure();
        analyzingRef.current = false;

        if (shareSlug) {
          try {
            sessionStorage.setItem(
              "ca_share_meta",
              JSON.stringify({
                slug: shareSlug,
                path: sharePath || `/r/${shareSlug}`,
              }),
            );
          } catch {
            /* ignore */
          }
          router.replace(`/r/${shareSlug}`);
        } else {
          goTo("done");
        }

        const syncLead = leadNow || lead || readLead();
        if (syncLead?.email) {
          void fetch("/api/kartra-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: syncLead.email,
              firstName:
                (syncLead.name || "Friend").split(/\s+/)[0] || "Friend",
              shareSlug,
              sharePath,
              report: {
                overallScore: nextReport.overallScore,
                level: nextReport.level,
                mainChallenge: {
                  title: nextReport.mainChallenge?.title || "",
                  strengths: nextReport.mainChallenge?.strengths,
                  improvements: nextReport.mainChallenge?.improvements,
                },
              },
            }),
            keepalive: true,
          }).catch(() => {});
        }
      } catch (err) {
        analyzingRef.current = false;
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        const message = aborted
          ? "This video took longer than 5 minutes. Try a shorter public clip, or wait a minute and retry the same link."
          : err instanceof Error
            ? err.message
            : "Something went wrong on our end. Please wait about a minute and try again.";
        const busy =
          aborted ||
          /busy|wait about a minute|try again later|quota|rate limit/i.test(
            message,
          );
        const waitSec = busy ? 60 : 8;
        showFailure(message, {
          retryWaitSec: waitSec,
          lastYoutubeUrl: url,
          lastDurationSec: lastDurationSec,
          lastCaptureMethod: "youtube",
        });
      } finally {
        window.clearTimeout(timeoutId);
        if (diagnosisStatusId != null) window.clearTimeout(diagnosisStatusId);
      }
    },
    [goTo, lastDurationSec, lastPromptQuestion, lead, router, showFailure],
  );

  if (!hydrated) {
    return <div className="app-shell" aria-busy="true" />;
  }

  const onLanding = phase === "landing" || phase === "name";

  return (
    <div className="app-shell">
      {onLanding && (
        <LandingPage
          onCta={startFunnel}
          onLeadComplete={(next) => {
            setLead(next);
            goTo("capture");
          }}
        />
      )}

      {phase === "analyzing" && (
        <AnalyzingState status={status} captureMethod={lastCaptureMethod} />
      )}

      {phase === "done" && report && (
        <DiagnosisPage report={report} onHome={goHome} />
      )}

      {phase === "failed" && error ? (
        <AnalyzeFailed
          message={error}
          audio={lastAudio}
          durationSec={lastDurationSec}
          retryWaitSec={retryWaitSec}
          onRetry={() =>
            lastYoutubeUrl
              ? void analyzeYoutube(lastYoutubeUrl)
              : lastAudio
                ? void analyzeAudio(
                    lastAudio,
                    lastDurationSec,
                    lastPromptQuestion,
                    lastCaptureMethod,
                  )
                : startNewClip()
          }
          onNewClip={startNewClip}
        />
      ) : null}

      {phase === "capture" && (
        <div>
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
            onAudioReady={(file, durationSec, promptQuestion, captureMethod) =>
              void analyzeAudio(
                file,
                durationSec,
                promptQuestion,
                captureMethod,
              )
            }
            onYoutubeReady={(url) => void analyzeYoutube(url)}
            onError={setError}
            disabled={!serverHasDefault}
          />
        </div>
      )}

      {phase !== "landing" && phase !== "name" && <SiteFooter />}
    </div>
  );
}
