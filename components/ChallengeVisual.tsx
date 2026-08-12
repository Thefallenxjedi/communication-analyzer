import Image from "next/image";
import type { ChallengeImageKey } from "@/lib/schema";
import {
  CHALLENGE_BLURBS,
  CHALLENGE_IMAGE_KEYS,
  CHALLENGE_LABELS,
} from "@/lib/schema";
import { CHALLENGE_SRC } from "@/lib/challenge-images";

export function ChallengeVisual({ imageKey }: { imageKey: string }) {
  const key = (
    (CHALLENGE_IMAGE_KEYS as readonly string[]).includes(imageKey)
      ? imageKey
      : "generic"
  ) as ChallengeImageKey;

  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-white">
        <Image
          src={CHALLENGE_SRC[key]}
          alt={CHALLENGE_LABELS[key]}
          fill
          className="object-contain p-2 sm:p-3"
          sizes="(max-width: 672px) 100vw, 672px"
          priority
        />
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-muted sm:text-sm">
        {CHALLENGE_BLURBS[key]}
      </p>
    </div>
  );
}
