import type { Metadata } from "next";
import Link from "next/link";
import { SharedReportView } from "@/components/SharedReportView";
import { getSharedReportBySlug } from "@/lib/shared-reports";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Your EliteSpeak Report",
    description: "Private communication diagnosis report.",
    robots: { index: false, follow: false },
    alternates: { canonical: `/r/${slug}` },
  };
}

export default async function SharedReportPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getSharedReportBySlug(slug);

  if (!result) {
    return (
      <main className="app-shell mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col justify-center px-4 py-16 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
          Report link
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          Report not found
        </h1>
        <p className="mt-3 text-sm text-muted">
          This link may be wrong, or the report was already removed.
        </p>
        <Link href="/" className="btn-primary mt-8 inline-flex justify-center">
          Start a new diagnosis
        </Link>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <SharedReportView report={result.report} shareSlug={result.slug} />
    </main>
  );
}
