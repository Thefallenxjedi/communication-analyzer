export function AboutEliteSpeak() {
  return (
    <section className="es-about" aria-labelledby="es-about-title">
      <header className="es-about-head">
        <p className="es-about-brand">EliteSpeak</p>
        <h1 id="es-about-title">About EliteSpeak</h1>
        <p>
          A private 90-day communication coaching program built around focused
          calls, personalized practice, and clear progress.
        </p>
      </header>
      <figure className="es-about-single">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/client/elitespeak-about.jpg"
          alt="EliteSpeak at a glance and eight-week coaching journey map"
        />
      </figure>
    </section>
  );
}
