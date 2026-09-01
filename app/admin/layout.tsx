import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { AdminShell } from "@/components/AdminShell";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

export default function AdminRootLayout({
  children}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        <AdminShell>{children}</AdminShell>
      </ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
