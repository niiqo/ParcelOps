"use client";

import type { ReactNode } from "react";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { NotificationViewport } from "@/components/notifications/NotificationViewport";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      {children}
      <NotificationViewport />
    </NotificationProvider>
  );
}