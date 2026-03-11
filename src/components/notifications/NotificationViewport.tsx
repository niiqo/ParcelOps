"use client";

import { useNotification } from "./NotificationProvider";
import { NotificationToast } from "./NotificationToast";

export function NotificationViewport() {
  const { notifications, remove } = useNotification();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-3">
      {notifications.map((item) => (
        <NotificationToast
          key={item.id}
          id={item.id}
          message={item.message}
          type={item.type}
          onClose={remove}
        />
      ))}
    </div>
  );
}