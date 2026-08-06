import { Suspense } from "react";
import { FunnelApp } from "@/components/FunnelApp";

export default function FunnelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div className="app-shell" aria-busy="true" />}>
        <FunnelApp />
      </Suspense>
      {/* Route segments exist so URLs resolve; UI comes from FunnelApp */}
      <div className="hidden" aria-hidden>
        {children}
      </div>
    </>
  );
}
