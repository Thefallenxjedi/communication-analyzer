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
  trailing,
}: {
  n: number;
  title: string;
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  meta?: ReactNode;
  /** Right-side cluster (e.g. expected time + status) before the chevron. */
  trailing?: ReactNode;
}) {
  const head = (
    <span className="es-report-step-main">
      <span className="es-report-num">{n}</span>
      <span className="es-report-step-head">
        <h3 className="es-report-step-title">{title}</h3>
        {meta ? <span className="es-report-step-meta">{meta}</span> : null}
      </span>
    </span>
  );

  const aside =
    trailing || onToggle ? (
      <span className="es-report-step-aside">
        {trailing}
        {onToggle ? (
          <span className="es-report-step-chevron" aria-hidden>
            {open ? "−" : "+"}
          </span>
        ) : null}
      </span>
    ) : null;

  return (
    <section className="es-report-step">
      {onToggle ? (
        <button type="button" onClick={onToggle} className="es-report-step-toggle">
          {head}
          {aside}
        </button>
      ) : (
        <div className="es-report-step-toggle es-report-step-toggle--static">
          {head}
          {aside}
        </div>
      )}
      {open ? <div className="es-report-step-body">{children}</div> : null}
    </section>
  );
}
