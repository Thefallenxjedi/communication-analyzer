import Image from "next/image";
import type { ChallengeImageKey } from "@/lib/schema";
import { CHALLENGE_IMAGE_KEYS } from "@/lib/schema";

const META: Record<
  ChallengeImageKey,
  { label: string; src: string }
> = {
  rambling: { label: "Rambling", src: "/challenges/rambling.png" },
  fillers: { label: "Fillers", src: "/challenges/fillers.png" },
  pace: { label: "Pace", src: "/challenges/pace.png" },
  clarity: { label: "Clarity", src: "/challenges/clarity.png" },
  confidence: { label: "Confidence", src: "/challenges/confidence.png" },
  structure: { label: "Structure", src: "/challenges/structure.png" },
  energy: { label: "Energy", src: "/challenges/energy.png" },
  presence: { label: "Presence", src: "/challenges/presence.png" },
  generic: { label: "Challenge", src: "/challenges/generic.png" },
};

export function ChallengeVisual({ imageKey }: { imageKey: string }) {
  const key = (
    (CHALLENGE_IMAGE_KEYS as readonly string[]).includes(imageKey)
      ? imageKey
      : "generic"
  ) as ChallengeImageKey;
  const meta = META[key];

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-white">
      <Image
        src={meta.src}
        alt={meta.label}
        fill
        className="object-contain p-2 sm:p-3"
        sizes="(max-width: 672px) 100vw, 672px"
        priority
      />
    </div>
  );
}
