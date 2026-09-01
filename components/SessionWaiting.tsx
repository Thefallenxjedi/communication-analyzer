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

const AWAITING_TASKS_MESSAGE =
  "This section will unlock once EliteSpeak reviews your call and assigns your tasks.";

export function SessionWaiting({
  sessionNumber,
  lockNote,
  awaitingCoach,
}: {
  sessionNumber: number;
  lockNote?: string;
  awaitingCoach?: boolean;
}) {
  const wait = sessionWaiting(sessionNumber);
  const theme = awaitingCoach ? undefined : wait.theme;
  const line = awaitingCoach ? AWAITING_TASKS_MESSAGE : wait.line;
  const motion = awaitingCoach ? "still" : wait.motion;

  return (
    <div className="es-wait">
      <VoiceMark motion={motion} />
      {theme ? <p className="es-wait-theme">{theme}</p> : null}
      <p className="es-wait-line">{line}</p>
      {lockNote ? <p className="es-wait-lock">{lockNote}</p> : null}
      <span className="es-wait-rule" aria-hidden />
    </div>
  );
}
