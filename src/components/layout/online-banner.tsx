"use client";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** NFR-09: tell the user when offline. */
export function OnlineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <p role="status" className="bg-warning-soft px-4 py-2 text-center text-sm font-semibold text-warning">⚠ Bạn đang offline — thay đổi sẽ không được lưu cho đến khi có mạng.</p>;
}
