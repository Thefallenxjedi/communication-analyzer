type HeroProps = {
  onAnalyzeClick?: () => void;
  showCta?: boolean;
};

export function Hero({ onAnalyzeClick, showCta = true }: HeroProps) {
  return (
    <header className="relative overflow-hidden">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <p className="font-serif text-lg tracking-wide text-foreground">
          Communication Analyzer
        </p>
        <ul className="hidden items-center gap-8 text-xs uppercase tracking-[0.16em] text-muted sm:flex">
          <li>
            <a href="#analyze" className="transition hover:text-accent">
              Analyze
            </a>
          </li>
          <li>
            <a href="#report" className="transition hover:text-accent">
              Report
            </a>
          </li>
          <li>
            <a href="#api-key" className="transition hover:text-accent">
              API key
            </a>
          </li>
        </ul>
      </nav>

      <div className="mx-auto max-w-5xl px-6 pb-16 pt-10 sm:pb-20 sm:pt-16">
        <p className="animate-fade-up text-sm text-muted">
          Speak with clarity. Measure what matters.
        </p>
        <div className="hairline my-6 max-w-md animate-fade-up" />
        <h1 className="animate-fade-up-delay max-w-2xl font-serif text-4xl leading-[1.15] text-foreground sm:text-5xl md:text-6xl">
          A free{" "}
          <em className="italic text-accent">communication analysis</em> report
          — in minutes.
        </h1>
        <p className="animate-fade-up-delay-2 mt-6 max-w-lg text-base leading-relaxed text-foreground/75">
          Upload a phone video or paste a YouTube link. We score 20 EliteSpeak
          markers (1–10) with timestamped coach notes — clarity, presence,
          fillers, structure, and more. Up to 4 minutes analyzed.
        </p>
        {showCta && (
          <div className="animate-fade-up-delay-2 mt-10">
            <button
              type="button"
              onClick={onAnalyzeClick}
              className="rounded-full bg-accent px-8 py-3.5 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-110"
            >
              Start analysis
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
