import type { CSSProperties } from "react";
import {
  isBarMotion,
  sessionWaiting,
  type WaitMotion,
} from "@/lib/session-waiting";

function barCount(motion: WaitMotion): number {
  if (motion === "count") return 3;
  return 4;
}

function VoiceMark({ motion }: { motion: WaitMotion }) {
  if (isBarMotion(motion)) {
    return (
      <div className={`es-wait-voice es-wait-voice--${motion}`} aria-hidden>
        {Array.from({ length: barCount(motion) }, (_, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    );
  }
  return (
    <div className={`es-wait-voice es-wait-voice--${motion}`} aria-hidden>
      <span />
      <span />
      <span />
    </div>
  );
}

export function SessionWaiting({
  sessionNumber,
  lockNote,
}: {
  sessionNumber: number;
  lockNote?: string;
}) {
  const wait = sessionWaiting(sessionNumber);
  return (
    <div className="es-wait">
      <VoiceMark motion={wait.motion} />
      <p className="es-wait-theme">{wait.theme}</p>
      <p className="es-wait-line">{wait.line}</p>
      {lockNote ? <p className="es-wait-lock">{lockNote}</p> : null}
      <span className="es-wait-rule" aria-hidden />
    </div>
  );
}
