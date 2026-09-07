import type { CSSProperties } from "react";
import {
  isBarMotion,
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

const WAITING_MESSAGE =
  "This section will be here when your coach assigns it. For now, practice the previous sections.";

export function SessionWaiting({
  sessionNumber,
  lockNote,
  awaitingCoach,
}: {
  sessionNumber: number;
  lockNote?: string;
  awaitingCoach?: boolean;
}) {
  void sessionNumber;
  void lockNote;
  void awaitingCoach;
  const theme = undefined;
  const line = WAITING_MESSAGE;
  const motion = "still";

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
