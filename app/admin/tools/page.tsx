"use client";

import Link from "next/link";
import { ViewerReadOnlyBanner } from "@/components/AdminReadOnly";
import { useAdminStaff } from "@/components/AdminShell";
import { TranscriptPromptEditor } from "@/components/TranscriptPromptEditor";

export default function AdminToolsPage() {
  const { canEdit } = useAdminStaff();

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 lg:px-8">
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
              AI tools
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Coaching prompts
            </h1>
            <p className="mt-2 max-w-3xl text-base text-muted">
              Edit the live prompts used for every transcript summary and task
              draft. Tasks are matched against the current exercise catalog.
              Run a transcript from a client page.
            </p>
          </div>
          <Link
            href="/admin/prompt"
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            Free diagnosis prompt
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          <ViewerReadOnlyBanner canEdit={canEdit} />
          <TranscriptPromptEditor canEdit={canEdit} />
        </div>
      </main>
    </div>
  );
}
