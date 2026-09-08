import {
  INTRO_SESSION,
  groupedProgramSession,
  sessionLabel,
} from "@/lib/coaching-program";

function waitingMessage(sessionNumber: number): string {
  // The session you need to complete first is the grouped previous session.
  const prevGrouped = groupedProgramSession(Math.max(INTRO_SESSION, sessionNumber - 1));
  const prevLabel = sessionLabel(prevGrouped);
  return `Your personalized practice will appear here after ${prevLabel}.`;
}

export function SessionWaiting({
  sessionNumber,
  lockNote,
  awaitingCoach,
}: {
  sessionNumber: number;
  lockNote?: string;
  awaitingCoach?: boolean;
}) {
  void awaitingCoach;

  return (
    <div className="es-wait">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="es-wait-illustration"
        src="/client/elitespeak-locked-practice.png"
        alt="A person practicing a speech with a microphone and phone camera"
      />
      <p className="es-wait-line">{waitingMessage(sessionNumber)}</p>
      {lockNote ? <p className="es-wait-lock">{lockNote}</p> : null}
    </div>
  );
}
