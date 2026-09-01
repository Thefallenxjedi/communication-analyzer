import type { ReactNode } from "react";

export function ClientAuthBrand() {
  return (
    <section className="es-login-brand" aria-label="EliteSpeak">
      <p className="es-wordmark es-wordmark--login">EliteSpeak</p>
      <h1 className="es-login-brand-title">Verbal Workout</h1>
      <p className="es-login-brand-lead">
        Elite communication coaching — one session at a time, with clear tasks
        and coach review after every call.
      </p>
      <span className="es-login-brand-rule" aria-hidden />
      <p className="es-login-brand-note">
        A private client portal for enrolled coaching clients.
      </p>
    </section>
  );
}

export function ClientAuthShell({
  panelLabel,
  children,
}: {
  panelLabel: string;
  children: ReactNode;
}) {
  return (
    <main className="es-login-split">
      <ClientAuthBrand />
      <section className="es-login-panel" aria-label={panelLabel}>
        <div className="es-login-panel-inner">{children}</div>
      </section>
    </main>
  );
}

export function GoogleMark() {
  return (
    <svg
      className="es-login-google-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
