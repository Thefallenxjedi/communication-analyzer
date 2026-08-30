export function Ember({
  state,
}: {
  state: "play" | "review" | "done";
}) {
  const kind =
    state === "done"
      ? "es-ember es-ember--done"
      : state === "review"
        ? "es-ember es-ember--pulse"
        : "es-ember";
  return (
    <span
      className={kind}
      aria-hidden
    />
  );
}
