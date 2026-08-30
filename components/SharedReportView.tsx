"use client";

import { useRouter } from "next/navigation";
import type { DiagnosisReport } from "@/lib/schema";
import { DiagnosisPage } from "@/components/DiagnosisPage";

type SharedReportViewProps = {
  report: DiagnosisReport;
  shareSlug: string;
};

export function SharedReportView({
  report,
  shareSlug,
}: SharedReportViewProps) {
  const router = useRouter();

  return (
    <DiagnosisPage
      report={report}
      sharePath={`/r/${shareSlug}`}
      onHome={() => router.push("/")}
    />
  );
}
