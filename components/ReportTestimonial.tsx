import Image from "next/image";

type ReportTestimonialBannerProps = {
  src: string;
  alt: string;
};

/** Full EliteSpeak testimonial artwork — image includes heading and card. */
export function ReportTestimonialBanner({ src, alt }: ReportTestimonialBannerProps) {
  return (
    <figure className="mx-auto w-full max-w-2xl lg:max-w-3xl 2xl:max-w-4xl">
      <Image
        src={src}
        alt={alt}
        width={1024}
        height={682}
        className="h-auto w-full rounded-2xl"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 768px, 896px"
      />
    </figure>
  );
}
