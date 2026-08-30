import { isIntroCallEmpty, type IntroCallReport } from "@/lib/intro-call";

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

  return (
    <div className="space-y-8 text-sm">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
          The EliteSpeak Guide
        </p>
        <h3 className="mt-1 text-lg font-extrabold">Intro Call Overview</h3>
        <p className="mt-1 text-muted">Prepared for {clientName}</p>
      </div>

      {report?.summary.trim() ? (
        <section>
          <h4 className="text-xl font-extrabold uppercase tracking-wide md:text-2xl">
            Our EliteSpeak Summary
          </h4>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{report.summary}</p>
        </section>
      ) : null}

      {report?.challenges.some((item) => item.title || item.body) ? (
        <section>
          <h4 className="text-xl font-extrabold uppercase tracking-wide md:text-2xl">
            Main Challenges
          </h4>
          <ul className="mt-3 space-y-4">
            {report.challenges.map((item, i) => (
              <li key={`${item.title}-${i}`}>
                {item.title ? <p className="font-bold">{item.title}</p> : null}
                {item.body ? (
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
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
          <h4 className="text-xl font-extrabold uppercase tracking-wide md:text-2xl">
            Coaching Schedule
          </h4>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">
            {report.coachingSchedule}
          </p>
        </section>
      ) : null}

      {report?.osItems.some((item) => item.name || item.goal || item.body) ? (
        <section>
          <h4 className="text-xl font-extrabold uppercase tracking-wide md:text-2xl">
            Biggest Communication OS
          </h4>
          <ul className="mt-3 space-y-4">
            {report.osItems.map((item, i) => (
              <li key={`${item.name}-${i}`}>
                <p className="font-bold">
                  {item.name}
                  {item.goal ? ` → ${item.goal}` : ""}
                </p>
                {item.body ? (
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
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
          <h4 className="text-xl font-extrabold uppercase tracking-wide md:text-2xl">
            What Reps Look Like
          </h4>
          <ol className="mt-3 list-decimal space-y-3 pl-5">
            {report.reps.map((item, i) => (
              <li key={`${item.title}-${i}`}>
                {item.title ? <p className="font-bold">{item.title}</p> : null}
                {item.body ? (
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
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
