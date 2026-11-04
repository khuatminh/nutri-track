import type { Metadata } from "next";

/**
 * Cấu hình SEO dùng chung (QLD-50).
 *
 * `APP_URL` là nguồn duy nhất cho origin tuyệt đối: canonical, OG URL và
 * `robots.txt` phải cùng một origin, nếu lệch nhau Google sẽ coi là bản sao.
 */
const RAW_APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const APP_URL = RAW_APP_URL.replace(/\/+$/, "");

/** Ghép path tương đối thành URL tuyệt đối cho canonical/OG. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, `${APP_URL}/`).toString();
}

/**
 * Trang sau đăng nhập (app, auth, onboarding) không có giá trị tìm kiếm và
 * trùng nội dung. Chặn index bằng meta tag; `robots.txt` chỉ là lớp phụ.
 */
export const NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
};

/**
 * Route công khai được phép index. Hiện **rỗng có chủ đích** vì NutriTrack
 * chưa có trang public nào (xem `docs/marketing/seo-baseline-audit.md` §3 P1).
 * Khi route `/calo/[slug]` được duyệt, thêm slug vào đây — sitemap tự sinh.
 */
export const PUBLIC_ROUTES: string[] = [];
