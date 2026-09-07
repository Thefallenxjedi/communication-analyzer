import type { ReactNode } from "react";

export function ViewerReadOnlyBanner({ canEdit }: { canEdit: boolean }) {
  if (canEdit) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <strong className="font-bold">Read-only access.</strong> Viewers can browse
      admin data but cannot edit clients, tasks, prompts, or delete analyses.
    </div>
  );
}

export function AdminReadOnly({
  canEdit,
  children,
  className = "",
}: {
  canEdit: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (canEdit) return <>{children}</>;
  return (
    <div
      className={`pointer-events-none select-none opacity-40 grayscale-[0.12] ${className}`}
      aria-disabled="true"
    >
      {children}
    </div>
  );
}
