"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  HOW_IT_WORKS_WEEK_COUNT,
  HOW_IT_WORKS_WEEKS,
  padWeek,
  type HowItWorksTask,
  type HowItWorksWeek,
} from "@/lib/how-it-works";

export function HowItWorksRoadmap({
  onActivityClick,
}: {
  onActivityClick?: (week: HowItWorksWeek, index: number, task: HowItWorksTask) => void;
}) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const weekRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;
        const index = Number((best.target as HTMLElement).dataset.weekIndex);
        if (Number.isInteger(index)) setActive(index);
      },
      { root, threshold: [0.35, 0.55, 0.75] },
    );
    weekRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  const goToWeek = useCallback((index: number) => {
    const next = Math.max(0, Math.min(HOW_IT_WORKS_WEEK_COUNT - 1, index));
    weekRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const week = HOW_IT_WORKS_WEEKS[active] ?? HOW_IT_WORKS_WEEKS[0];

  return (
    <section className="es-roadmap" aria-label="How EliteSpeak Works">
      <header className="es-roadmap-head">
        <div className="es-roadmap-head-copy">
          <h1>How EliteSpeak Works</h1>
          <p>An 8-week communication transformation program</p>
        </div>
        <div className="es-roadmap-progress" aria-live="polite">
          <p className="es-roadmap-fraction">
            <span className="es-mono">{padWeek(week.number)}</span>
            <span> / {padWeek(HOW_IT_WORKS_WEEK_COUNT)}</span>
          </p>
          <p className="es-roadmap-week-of">
            Week {week.number} of {HOW_IT_WORKS_WEEK_COUNT}
          </p>
        </div>
        <ol className="es-roadmap-dots">
          {HOW_IT_WORKS_WEEKS.map((item, index) => (
            <li key={item.number}>
              {index > 0 ? <span className="es-roadmap-dot-rule" aria-hidden /> : null}
              <button
                type="button"
                className={
                  index === active
                    ? "es-roadmap-dot es-roadmap-dot--on"
                    : index < active
                      ? "es-roadmap-dot es-roadmap-dot--past"
                      : "es-roadmap-dot"
                }
                aria-current={index === active ? "true" : undefined}
                aria-label={`Week ${item.number}: ${item.title}`}
                onClick={() => goToWeek(index)}
              >
                {padWeek(item.number)}
              </button>
            </li>
          ))}
        </ol>
      </header>

      <div ref={scrollerRef} className="es-roadmap-scroller">
        {HOW_IT_WORKS_WEEKS.map((item, index) => (
          <article
            key={item.number}
            ref={(node) => {
              weekRefs.current[index] = node;
            }}
            data-week-index={index}
            className={
              index === active
                ? "es-roadmap-week es-roadmap-week--active"
                : index < active
                  ? "es-roadmap-week es-roadmap-week--past"
                  : "es-roadmap-week"
            }
          >
            <p className="es-roadmap-giant es-mono" aria-hidden>
              {padWeek(item.number)}
            </p>
            <div className="es-roadmap-week-grid">
              <div className="es-roadmap-week-copy">
                <p className="es-label">Week {item.number}</p>
                <h2>
                  {item.lines.map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h2>
                <span className="es-roadmap-rule" aria-hidden />
                <p className="es-roadmap-count">
                  {item.tasks.length}{" "}
                  {item.tasks.length === 1 ? "activity" : "activities"}
                </p>
              </div>
              <ol className="es-roadmap-tasks">
                {item.tasks.map((task, taskIndex) => (
                  <li key={`${item.number}-${task.title}`}>
                    <button
                      type="button"
                      className="es-roadmap-task"
                      style={{ "--es-task-i": taskIndex } as CSSProperties}
                      onClick={() => onActivityClick?.(item, taskIndex, task)}
                    >
                      <span className="es-mono es-roadmap-task-n">
                        {padWeek(taskIndex + 1)}
                      </span>
                      <span className="es-roadmap-task-body">
                        <span className="es-roadmap-task-title">{task.title}</span>
                        {task.note ? (
                          <span className="es-roadmap-task-note">{task.note}</span>
                        ) : null}
                      </span>
                      <span className="es-roadmap-task-arrow" aria-hidden>
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="es-roadmap-week-nav">
              {index > 0 ? (
                <button type="button" onClick={() => goToWeek(index - 1)}>
                  ← Previous
                </button>
              ) : (
                <span />
              )}
              {index < HOW_IT_WORKS_WEEK_COUNT - 1 ? (
                <button type="button" onClick={() => goToWeek(index + 1)}>
                  Week {padWeek(item.number)} → Week {padWeek(item.number + 1)}
                </button>
              ) : (
                <span className="es-roadmap-end">The program completes here.</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
