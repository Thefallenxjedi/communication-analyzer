import type { CSSProperties } from "react";
import { isIntroCallEmpty, type IntroCallReport } from "@/lib/intro-call";

const serif: CSSProperties = {
  fontFamily: 'var(--font-playfair), Georgia, "Times New Roman", serif',
};

function formatReportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function splitSummary(raw: string): { body: string; callout: string } {
  const parts = raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      body: parts.slice(0, -1).join("\n\n"),
      callout: parts[parts.length - 1] ?? "",
    };
  }
  const sentences = raw.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (sentences && sentences.length >= 2) {
    return {
      body: sentences.slice(0, -1).join("").trim(),
      callout: sentences[sentences.length - 1]?.trim() ?? "",
    };
  }
  return { body: raw.trim(), callout: "" };
}

function DocHeading({ children }: { children: string }) {
  return (
    <div className="es-doc-head mb-3">
      <h4 className="es-doc-title text-2xl leading-snug" style={serif}>
        {children}
      </h4>
      <span className="es-doc-rule mt-2 block h-px w-16 bg-[#c9a968]" aria-hidden />
    </div>
  );
}

export function IntroCallView({
  clientName,
  report,
}: {
  clientName: string;
  report: IntroCallReport | null;
}) {
  if (isIntroCallEmpty(report)) {
    return (
      <p className="text-sm text-muted">
        Intro Call overview has not been written yet.
      </p>
    );
  }

  const summary = report?.summary.trim() ?? "";
  const { body, callout } = summary ? splitSummary(summary) : { body: "", callout: "" };
  const dated = report?.updatedAt ? formatReportDate(report.updatedAt) : "";

  return (
    <div className="es-doc space-y-9">
      {summary ? (
        <section className="es-summary">
          <h3 className="es-summary-title text-3xl leading-tight" style={serif}>
            Our EliteSpeak Summary
          </h3>
          <span className="es-doc-rule mt-2 mb-3 block h-px w-16 bg-[#c9a968]" aria-hidden />
          <p className="es-summary-name text-lg" style={serif}>
            {clientName}
          </p>
          {dated ? (
            <p className="es-summary-date mt-1 text-sm text-[#7a6f5d]">{dated}</p>
          ) : null}
          {body ? (
            <p className="es-summary-body mt-5 text-base leading-relaxed" style={serif}>
              {body}
            </p>
          ) : null}
          {callout ? (
            <p
              className="es-summary-callout mt-6 border border-[#c9a968] px-5 py-4 text-center text-base leading-relaxed italic"
              style={serif}
            >
              {callout}
            </p>
          ) : null}
        </section>
      ) : null}

      {report?.challenges.some((item) => item.title || item.body) ? (
        <section>
          <DocHeading>Main Challenges</DocHeading>
          <ul className="es-doc-list">
            {report.challenges.map((item, i) => (
              <li key={`${item.title}-${i}`}>
                {item.title ? (
                  <p className="es-doc-item-title" style={serif}>
                    {item.title}
                  </p>
                ) : null}
                {item.body ? (
                  <p className="es-doc-copy" style={serif}>
                    {item.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report?.coachingSchedule.trim() ? (
        <section>
          <DocHeading>Coaching Schedule</DocHeading>
          <p className="es-doc-copy" style={serif}>
            {report.coachingSchedule}
          </p>
        </section>
      ) : null}

      {report?.osItems.some((item) => item.name || item.goal || item.body) ? (
        <section>
          <DocHeading>Biggest Communication OS</DocHeading>
          <ul className="es-doc-list">
            {report.osItems.map((item, i) => (
              <li key={`${item.name}-${i}`}>
                <p className="es-doc-item-title" style={serif}>
                  {item.name}
                  {item.goal ? ` → ${item.goal}` : ""}
                </p>
                {item.body ? (
                  <p className="es-doc-copy" style={serif}>
                    {item.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report?.reps.some((item) => item.title || item.body) ? (
        <section>
          <DocHeading>What Reps Look Like</DocHeading>
          <ol className="es-doc-list es-doc-ol">
            {report.reps.map((item, i) => (
              <li key={`${item.title}-${i}`}>
                {item.title ? (
                  <p className="es-doc-item-title" style={serif}>
                    {item.title}
                  </p>
                ) : null}
                {item.body ? (
                  <p className="es-doc-copy" style={serif}>
                    {item.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
