"use client";

type LandingPageProps = {
  onCta: () => void;
};

export function LandingPage({ onCta }: LandingPageProps) {
  return (
    <div className="w-full">
      <header className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-14 text-center sm:pt-20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          EliteSpeak
        </p>
        <h1 className="mt-4 text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Know how you actually sound before your next important conversation.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Whether it&apos;s an interview, sales call, presentation, podcast, or
          team meeting — your communication leaves an impression long before
          your ideas do.
        </p>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
          Upload a recording up to <strong className="text-foreground">4 minutes</strong>,
          and get a personalized AI diagnosis that shows exactly how you come
          across and what to fix.
        </p>
        <button type="button" onClick={onCta} className="btn-primary mt-8 max-w-md">
          Get My Free Communication Report
        </button>
        <p className="mt-3 text-xs text-muted sm:text-sm">
          Free report • 4-minute audio • Results in under 2 minutes
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
              "Confidence",
              "Clarity",
              "Speaking Pace",
              "Structure",
              "Energy",
              "Filler Words",
              "Presence",
              "Vocabulary",
              "And more markers",
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

      <section className="border-y border-border bg-card px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
            How It Works
          </h2>
          <ol className="mt-10 space-y-8">
            {[
              {
                n: "1",
                t: "Upload Your Audio",
                d: "Upload any recording up to four minutes — interviews, meetings, sales calls, practice sessions, presentations.",
              },
              {
                n: "2",
                t: "AI Analyzes Your Communication",
                d: "We evaluate your speech across confidence, clarity, pacing, structure, and delivery.",
              },
              {
                n: "3",
                t: "Receive Your Diagnosis",
                d: "Get a blunt breakdown of your main challenge, where you rank, and what to do next.",
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{step.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.d}</p>
                </div>
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
          <button type="button" onClick={onCta} className="btn-primary mt-8">
            Get My Free Communication Report
          </button>
          <p className="mt-3 text-xs text-muted">
            Free • 4-minute audio • Instant AI analysis
          </p>
        </div>
      </section>
    </div>
  );
}
