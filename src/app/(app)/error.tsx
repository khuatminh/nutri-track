"use client";
import { useEffect } from "react";

/** NFR-09: a client-side render error must not leave a blank page. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-surface p-6 text-center shadow-[var(--shadow-1)]">
      <span className="text-4xl" aria-hidden>⚠️</span>
      <h1 className="text-xl font-semibold">Trang này đang gặp sự cố</h1>
      <p className="text-sm text-muted">Dữ liệu bạn đã nhập vẫn an toàn. Hãy thử tải lại phần này; nếu vẫn lỗi, kiểm tra kết nối mạng.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button className="min-h-11 rounded-md bg-primary px-5 font-semibold text-primary-contrast" onClick={reset}>Thử lại</button>
        <a className="min-h-11 content-center rounded-md border border-border-strong px-5 font-semibold" href="/hom-nay">Về trang chính</a>
      </div>
    </div>
  );
}
