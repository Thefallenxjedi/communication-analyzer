import {
  isIntroCallEmpty,
  type IntroCallReport,
} from "@/lib/intro-call";
import {
  padRepNumber,
  padSectionIndex,
  splitCallout,
  splitParagraphs,
} from "@/lib/intro-call-text";

function formatReportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function DocHeading({ children }: { children: string }) {
  return (
    <div className="es-doc-head">
      <h4 className="es-doc-title">{children}</h4>
      <span className="es-doc-rule" aria-hidden />
    </div>
  );
}

function SectionFooter({
  clientName,
  index,
}: {
  clientName: string;
  index: number;
}) {
  return (
    <p className="es-doc-footer" aria-hidden>
      ELITESPEAK · INTRO CALL OVERVIEW · {clientName.toUpperCase()} ·{" "}
      {padSectionIndex(index)}
    </p>
  );
}

function ProseBlock({ text, className = "es-doc-copy" }: {
  text: string;
  className?: string;
}) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return null;
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={className}>
          {p}
        </p>
      ))}
    </>
  );
}

function CalloutBox({ children }: { children: string }) {
  if (!children.trim()) return null;
  return <p className="es-summary-callout">{children}</p>;
}

function ProseWithCallout({
  text,
  copyClass = "es-doc-copy",
}: {
  text: string;
  copyClass?: string;
}) {
  const { main, callout } = splitCallout(text);
  if (!main && !callout) return null;
  return (
    <>
      <ProseBlock text={main} className={copyClass} />
      {callout ? <CalloutBox>{callout}</CalloutBox> : null}
    </>
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
      <p className="es-intro-empty text-sm text-muted">
        Intro Call overview has not been written yet.
      </p>
    );
  }

  const summary = report?.summary.trim() ?? "";
  const dated = report?.updatedAt ? formatReportDate(report.updatedAt) : "";
  const { main: summaryMain, callout: summaryCallout } = splitCallout(summary);

  const hasChallenges = report?.challenges.some(
    (item) => item.title || item.body,
  );
  const hasSchedule = report?.coachingSchedule.trim();
  const hasOs = report?.osItems.some(
    (item) => item.name || item.goal || item.body,
  );
  const hasReps = report?.reps.some((item) => item.title || item.body);

  let sectionIndex = 0;

  return (
    <div className="es-intro-doc">
      <header className="es-doc-masthead">
        <p className="es-doc-masthead-guide">The EliteSpeak Guide</p>
        <h2 className="es-doc-masthead-title">Intro Call Overview</h2>
        <p className="es-doc-masthead-prepared">
          Prepared for <span>{clientName}</span>
        </p>
      </header>

      {summary ? (
        <section className="es-doc-section es-summary">
          <DocHeading>Our EliteSpeak Summary</DocHeading>
          <p className="es-summary-name">{clientName}</p>
          {dated ? <p className="es-summary-date">{dated}</p> : null}
          <ProseBlock text={summaryMain} className="es-summary-body" />
          {summaryCallout ? <CalloutBox>{summaryCallout}</CalloutBox> : null}
          <SectionFooter
            clientName={clientName}
            index={(sectionIndex += 1)}
          />
        </section>
      ) : null}

      {hasChallenges ? (
        <section className="es-doc-section">
          <DocHeading>Main Challenges</DocHeading>
          <ul className="es-doc-challenges">
            {report!.challenges.map((item, i) => {
              if (!item.title.trim() && !item.body.trim()) return null;
              const { main, callout } = splitCallout(item.body);
              return (
                <li key={`${item.title}-${i}`} className="es-doc-challenge">
                  {item.title ? (
                    <p className="es-doc-challenge-head">{item.title}</p>
                  ) : null}
                  <ProseBlock text={main} className="es-doc-copy" />
                  {callout ? (
                    <p className="es-doc-emphasis">{callout}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <SectionFooter
            clientName={clientName}
            index={(sectionIndex += 1)}
          />
        </section>
      ) : null}

      {hasSchedule ? (
        <section className="es-doc-section">
          <DocHeading>Coaching Schedule</DocHeading>
          <ProseWithCallout text={report!.coachingSchedule} />
          <SectionFooter
            clientName={clientName}
            index={(sectionIndex += 1)}
          />
        </section>
      ) : null}

      {hasOs ? (
        <section className="es-doc-section">
          <DocHeading>Biggest Communication OS</DocHeading>
          <ul className="es-doc-os-list">
            {report!.osItems.map((item, i) => {
              if (!item.name.trim() && !item.goal.trim() && !item.body.trim()) {
                return null;
              }
              const { main, callout } = splitCallout(item.body);
              return (
                <li key={`${item.name}-${i}`} className="es-doc-os-item">
                  <p className="es-doc-os-label">
                    {item.name ? (
                      <span className="es-doc-os-name">{item.name}</span>
                    ) : null}
                    {item.goal ? (
                      <span className="es-doc-os-goal">{item.goal}</span>
                    ) : null}
                  </p>
                  <ProseBlock text={main} className="es-doc-copy" />
                  {callout ? <CalloutBox>{callout}</CalloutBox> : null}
                </li>
              );
            })}
          </ul>
          <SectionFooter
            clientName={clientName}
            index={(sectionIndex += 1)}
          />
        </section>
      ) : null}

      {hasReps ? (
        <section className="es-doc-section">
          <DocHeading>What Reps Look Like</DocHeading>
          <ol className="es-doc-reps">
            {report!.reps.map((item, i) => {
              if (!item.title.trim() && !item.body.trim()) return null;
              return (
                <li key={`${item.title}-${i}`} className="es-doc-rep">
                  <span className="es-doc-rep-num">{padRepNumber(i + 1)}</span>
                  <div className="es-doc-rep-body">
                    {item.title ? (
                      <p className="es-doc-rep-title">{item.title}</p>
                    ) : null}
                    {item.body ? (
                      <p className="es-doc-copy es-doc-copy--rep">{item.body}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          <SectionFooter
            clientName={clientName}
            index={(sectionIndex += 1)}
          />
        </section>
      ) : null}
    </div>
  );
}
