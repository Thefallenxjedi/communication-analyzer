"use client";

type LandingPageProps = {
  onCta: () => void;
};

export function LandingPage({ onCta }: LandingPageProps) {
  return (
    <div className="w-full">
      <header className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-12 pt-12 text-center sm:pb-16 sm:pt-20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          EliteSpeak
        </p>
        <h1 className="mt-4 text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Know how you actually sound before your next important conversation.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:mt-5 sm:text-lg">
          Suggested min 30s
        </p>
        <button
          type="button"
          onClick={onCta}
          className="btn-primary btn-primary-lg mt-8 w-full max-w-md"
        >
          Get My Free Communication Report
        </button>
        <p className="mt-3 text-sm font-medium text-muted">
          Free tool to analyze
        </p>
      </header>

      <section className="border-y border-border bg-card px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
            What You&apos;ll Discover
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted sm:text-base">
            Your report analyzes how you communicate — not just what you say.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Overall Communication Score",
              "Clarity & Structure",
              "Executive Presence",
              "Filler Word Density",
              "Calm & Pause Quality",
              "Assertiveness",
              "Conciseness",
              "Impact",
              "Visual Language",
              "20 markers total",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-10 px-4 py-14 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-extrabold text-red-600 sm:text-2xl">
            Stop Guessing
          </h2>
          <p className="mt-2 text-sm font-semibold text-muted">You don&apos;t know…</p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90">
            {[
              "If you sound confident",
              "Why people lose attention",
              "Whether you're speaking too fast",
              "If you're using too many filler words",
              "Why presentations aren't landing",
              "How recruiters or clients actually hear you",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="shrink-0">❌</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-emerald-600 sm:text-2xl">
            Start Knowing
          </h2>
          <p className="mt-2 text-sm font-semibold text-muted">
            After your report, you&apos;ll know
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90">
            {[
              "Your strongest communication skills",
              "Your biggest improvement opportunity",
              "Exactly where your speech breaks down",
              "What to practice first",
              "A simple improvement plan you can start today",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="shrink-0">✅</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-border bg-card px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-lg font-extrabold sm:text-2xl">
            How It Works
          </h2>
          <ol className="mt-5 flex flex-col gap-3 sm:mt-8 sm:gap-4">
            {[
              { n: "1", t: "Record or upload audio (up to 2 min)" },
              { n: "2", t: "AI scores how you communicate" },
              { n: "3", t: "Get your diagnosis + next steps" },
            ].map((step) => (
              <li
                key={step.n}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white sm:h-8 sm:w-8 sm:text-sm">
                  {step.n}
                </span>
                <span className="text-sm font-semibold sm:text-base">{step.t}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
          Who Is This For?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {[
            "Job seekers",
            "Founders",
            "Sales professionals",
            "Managers",
            "Students",
            "Content creators",
            "Public speakers",
            "Consultants",
          ].map((who) => (
            <span
              key={who}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
            >
              {who}
            </span>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card px-4 py-14">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Why Audio Only?</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Words, pacing, pauses, and delivery reveal most communication habits.
            No camera. No complicated setup. Just upload or record — and get your
            diagnosis.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center text-2xl font-extrabold">FAQ</h2>
        <dl className="mt-8 space-y-6">
          {[
            ["How long can my recording be?", "Up to four minutes."],
            ["What file types are supported?", "MP3, WAV, and M4A."],
            ["Is this free?", "Yes. Your first communication report is completely free."],
            ["How long does analysis take?", "Usually under two minutes."],
            [
              "Is my audio stored?",
              "Only for processing your report. Your recordings are not used to train AI models.",
            ],
          ].map(([q, a]) => (
            <div key={q} className="rounded-2xl border border-border bg-card p-5">
              <dt className="font-bold">{q}</dt>
              <dd className="mt-2 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-4 pb-20 pt-6">
        <div className="card-surface mx-auto max-w-xl px-6 py-10 text-center sm:px-10">
          <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
            Your next conversation is already being judged.
          </h2>
          <p className="mt-3 text-sm text-muted">
            Know how you sound before it matters.
          </p>
          <button
            type="button"
            onClick={onCta}
            className="btn-primary btn-primary-lg mt-8"
          >
            Get My Free Communication Report
          </button>
          <p className="mt-3 text-sm font-medium text-muted">
            Free tool to analyze
          </p>
        </div>
      </section>
    </div>
  );
}
