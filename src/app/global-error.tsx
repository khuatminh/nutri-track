"use client";
import { useEffect } from "react";

/** Last-resort boundary for errors thrown above the app layout (NFR-09: no white screen). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <main role="alert" style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>NutriTrack đang gặp sự cố</h1>
          <p>Dữ liệu bạn đã nhập vẫn an toàn. Hãy thử lại; nếu vẫn lỗi, kiểm tra kết nối mạng.</p>
          <button onClick={reset} style={{ minHeight: 44, padding: "0 20px", fontWeight: 600 }}>Thử lại</button>
        </main>
      </body>
    </html>
  );
}
