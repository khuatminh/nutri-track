import type { MetadataRoute } from "next";
import { APP_URL, PUBLIC_ROUTES } from "@/lib/seo";

/**
 * QLD-50 — robots.txt
 *
 * Chỉ chặn các route không có giá trị tìm kiếm (app sau đăng nhập + auth + API).
 * Các trang này còn được chặn index bằng meta tag trong layout tương ứng.
 *
 * `Sitemap:` chỉ xuất hiện khi đã có route public thật — không trỏ Google tới
 * một sitemap rỗng (xem `PUBLIC_ROUTES`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/onboarding",
          "/hom-nay",
          "/nhat-ky",
          "/can-nang",
          "/ho-so",
          "/bao-cao",
          "/cong-thuc",
        ],
      },
    ],
    ...(PUBLIC_ROUTES.length > 0 ? { sitemap: `${APP_URL}/sitemap.xml` } : {}),
  };
}
