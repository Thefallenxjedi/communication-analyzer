import { ProgressBar } from "./ProgressBar";

type ScoreCardProps = {
  label: string;
  score: number;
  note: string;
};

export function ScoreCard({ label, score, note }: ScoreCardProps) {
  return (
    <article className="flex flex-col gap-3 border border-border bg-card/60 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </h3>
        <p className="font-serif text-2xl text-accent tabular-nums">
          {Math.round(score)}
          <span className="text-sm text-muted">/100</span>
        </p>
      </div>
      <ProgressBar value={score} />
      <p className="text-sm leading-relaxed text-foreground/75">{note}</p>
    </article>
  );
}
