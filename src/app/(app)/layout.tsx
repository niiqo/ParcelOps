import type { ReactNode } from "react";
import { AuthProvider } from "@/auth/AuthProvider";
import AppShell from "@/components/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
        <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}