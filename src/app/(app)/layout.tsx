import type { ReactNode } from "react";
import { AuthProvider } from "@/auth/AuthProvider";
import AuthGuard from "@/auth/AuthGuard";
import AppShell from "@/components/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </AuthProvider>
  );
}