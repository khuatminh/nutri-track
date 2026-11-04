import type { MetadataRoute } from "next";
import { APP_URL, PUBLIC_ROUTES } from "@/lib/seo";

/**
 * QLD-50 — sitemap.xml
 *
 * Danh sách rỗng hiện tại là trạng thái đúng: NutriTrack chưa có route public
 * (mọi trang nội dung đều nằm sau đăng nhập). Khi `/calo/[slug]` được duyệt,
 * thêm slug vào `PUBLIC_ROUTES` và sitemap tự cập nhật — không submit sitemap
 * rỗng lên Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({
    url: `${APP_URL}${path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
