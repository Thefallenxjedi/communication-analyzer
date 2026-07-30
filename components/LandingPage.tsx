"use client";

type LandingPageProps = {
  onCta: () => void;
};

export function LandingPage({ onCta }: LandingPageProps) {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative mx-auto flex min-h-[88vh] w-full max-w-5xl flex-col items-center justify-center px-6 pb-16 pt-20 text-center">
        <p className="animate-fade-up font-serif text-2xl italic text-neon sm:text-3xl">
          Communication Analyzer
        </p>
        <h1 className="animate-fade-up-delay mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
          Want to know how you actually sound before your next big conversation?
        </h1>
        <p className="animate-fade-up-delay-2 mt-6 max-w-xl text-base text-zinc-300 sm:text-lg">
          Free EliteSpeak-style report across 20 communication markers. Record,
          upload, or drop a YouTube link — we analyze up to 4 minutes.
        </p>
        <div className="animate-fade-up-delay-2 mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onCta}
            className="btn-neon rounded-full px-10 py-4 text-base tracking-wide shadow-[0_0_40px_rgba(216,255,0,0.25)]"
          >
            Get My Free Communication Report
          </button>
          <p className="text-sm text-zinc-400">No cost. Takes minutes.</p>
        </div>
      </section>

      {/* Mid: stop / finally */}
      <section className="bg-white px-6 py-20 text-zinc-900">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold uppercase tracking-wide text-stop-red sm:text-3xl">
              You will stop
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-relaxed text-zinc-700">
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-stop-red" />
                Guessing how you come across in meetings and interviews
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-stop-red" />
                Blindness to fillers, rambling, and weak openings
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-stop-red" />
                Vague feedback that doesn&apos;t tell you what to fix
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold uppercase tracking-wide text-go-green sm:text-3xl">
              You will finally
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-relaxed text-zinc-700">
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-go-green" />
                Get a 20-marker EliteSpeak-style breakdown with scores
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-go-green" />
                See sentence-level tips and word tags on your timeline
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-go-green" />
                Walk away with Top 3 drills and a 24-hour action plan
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom offer */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-center backdrop-blur-sm sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Know how you communicate — before it costs you the room
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-zinc-300 sm:text-base">
            Free coaching-style report. Not a clinical assessment. Just clear
            signals on what to practice next.
          </p>
          <button
            type="button"
            onClick={onCta}
            className="btn-neon mt-8 rounded-full px-10 py-4 text-base tracking-wide"
          >
            Start My Free Report
          </button>
        </div>
      </section>
    </div>
  );
}
