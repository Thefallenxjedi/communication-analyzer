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
      <div className="es-report-main">
        <header className="es-report-head">
          <p className="es-report-brand">EliteSpeak</p>
          <h1 className="es-report-title">{title}</h1>
          <span className="es-report-rule" aria-hidden />
        </header>
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
  open = true,
  onToggle,
  meta,
}: {
  n: number;
  title: string;
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  meta?: ReactNode;
}) {
  return (
    <section className="es-report-step">
      {onToggle ? (
        <button type="button" onClick={onToggle} className="es-report-step-toggle">
          <span className="flex items-start gap-3">
            <span className="es-report-num">{n}</span>
            <span className="es-report-step-head">
              <h3 className="es-report-step-title">{title}</h3>
              {meta ? <span className="es-report-step-meta">{meta}</span> : null}
            </span>
          </span>
          <span className="es-report-step-chevron" aria-hidden>
            {open ? "−" : "+"}
          </span>
        </button>
      ) : (
        <div className="flex items-start gap-3">
          <span className="es-report-num">{n}</span>
          <span className="es-report-step-head">
            <h3 className="es-report-step-title">{title}</h3>
            {meta ? <span className="es-report-step-meta">{meta}</span> : null}
          </span>
        </div>
      )}
      {open ? <div className="es-report-step-body">{children}</div> : null}
    </section>
  );
}
