"use client";

import { useEffect, useState } from "react";
import type { NotificationType } from "./NotificationProvider";

type Props = {
  id: string;
  message: string;
  type: NotificationType;
  onClose: (id: string) => void;
};

function getTypeStyles(type: NotificationType) {
  switch (type) {
    case "success":
      return {
        container: "border-emerald-200 bg-emerald-50 text-emerald-900",
        iconWrap: "bg-emerald-100 text-emerald-700",
        icon: "✓",
      };
    case "error":
      return {
        container: "border-rose-200 bg-rose-50 text-rose-900",
        iconWrap: "bg-rose-100 text-rose-700",
        icon: "✕",
      };
    case "warning":
      return {
        container: "border-amber-200 bg-amber-50 text-amber-900",
        iconWrap: "bg-amber-100 text-amber-700",
        icon: "!",
      };
    case "info":
    default:
      return {
        container: "border-sky-200 bg-sky-50 text-sky-900",
        iconWrap: "bg-sky-100 text-sky-700",
        icon: "i",
      };
  }
}

export function NotificationToast({ id, message, type, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const styles = getTypeStyles(type);

    useEffect(() => {
    const enterTimer = window.setTimeout(() => {
        setVisible(true);
    }, 10);

    const autoCloseTimer = window.setTimeout(() => {
        handleClose();
    }, 3000);

    return () => {
        clearTimeout(enterTimer);
        clearTimeout(autoCloseTimer);
    };
    }, []);

  function handleClose() {
    setClosing(true);
    setVisible(false);

    window.setTimeout(() => {
      onClose(id);
    }, 300);
  }

  return (
    <div className="pointer-events-auto">
      <div
        className={[
          "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-transform transition-opacity duration-300 ease-in-out duration-300",
          styles.container,
          visible && !closing
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            styles.iconWrap,
          ].join(" ")}
          aria-hidden="true"
        >
          {styles.icon}
        </div>

        <div className="flex-1 text-sm font-medium leading-5">
          {message}
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-base font-bold opacity-60 transition hover:opacity-100"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>
    </div>
  );
}