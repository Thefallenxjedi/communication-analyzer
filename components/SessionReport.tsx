import type { ReactNode } from "react";

export function SessionReport({
  kicker,
  title,
  children,
  className = "",
}: {
  kicker?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`es-report ${className}`.trim()}>
      <div className="es-report-rail-top" aria-hidden />
      <div className="es-report-rail" aria-hidden>
        <span>Cultivate excellence, every day</span>
      </div>
      <div className="es-report-main">
        <p className="es-report-brand">EliteSpeak</p>
        <div className="es-report-bar">{title}</div>
        {kicker ? <p className="es-report-kicker">{kicker}</p> : null}
        <div className="es-report-body">{children}</div>
      </div>
    </article>
  );
}

export function SessionReportStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="es-report-step">
      <div className="flex items-start gap-3">
        <span className="es-report-num">{n}</span>
        <h3 className="es-report-step-title">{title}</h3>
      </div>
      <div className="es-report-step-body">{children}</div>
    </section>
  );
}
