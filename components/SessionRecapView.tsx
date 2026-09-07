"use client";

export function SessionRecapView({
  sessionLabel,
  recap,
}: {
  sessionLabel: string;
  recap: string;
}) {
  const paragraphs = recap
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="es-session-recap">
      <div className="es-task-sheet es-session-recap-sheet">
        <h3 className="es-session-recap-title">{sessionLabel} summary</h3>
        <span className="es-doc-rule" aria-hidden />
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} className="es-session-recap-body">
              {p}
            </p>
          ))
        ) : (
          <p className="es-session-recap-body">{recap}</p>
        )}
      </div>
    </section>
  );
}
