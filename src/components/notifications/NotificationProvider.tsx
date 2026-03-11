"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

export type NotificationItem = {
  id: string;
  message: string;
  type: NotificationType;
};

type NotificationContextValue = {
  notifications: NotificationItem[];
  show: (message: string, type?: NotificationType) => void;
  remove: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));

    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const show = useCallback(
    (message: string, type: NotificationType = "info") => {
      const id = createId();

      setNotifications((prev) => [...prev, { id, message, type }]);

      const timer = window.setTimeout(() => {
        remove(id);
      }, 3000);

      timersRef.current[id] = timer;
    },
    [remove]
  );

  const value = useMemo(
    () => ({
      notifications,
      show,
      remove,
      success: (message: string) => show(message, "success"),
      error: (message: string) => show(message, "error"),
      info: (message: string) => show(message, "info"),
      warning: (message: string) => show(message, "warning"),
    }),
    [notifications, show, remove]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification debe usarse dentro de NotificationProvider");
  }
  return ctx;
}