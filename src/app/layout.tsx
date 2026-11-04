import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { cookies, headers } from "next/headers";
import { THEME_COOKIE, THEME_INIT_SCRIPT, type ThemePref } from "@/lib/theme";
import { APP_URL } from "@/lib/seo";
import "./globals.css";

const font = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  // QLD-50: origin tuyệt đối cho canonical/OG. Thiếu metadataBase thì OG image
  // và canonical tương đối bị trình thu thập bỏ qua.
  metadataBase: new URL(APP_URL),
  applicationName: "NutriTrack",
  title: { default: "NutriTrack — Đếm calo món Việt", template: "%s · NutriTrack" },
  description:
    "Tra calo và macro của 289 món Việt, ghi bữa ăn trong 30 giây. Số liệu tham khảo từ Viện Dinh dưỡng và USDA FDC.",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "NutriTrack",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F8F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1511" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pref = (await cookies()).get(THEME_COOKIE)?.value as ThemePref | undefined;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const theme = pref === "light" || pref === "dark" ? pref : undefined;
  return (
    <html lang="vi" data-theme={theme} className={font.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
