import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { cookies, headers } from "next/headers";
import { THEME_COOKIE, THEME_INIT_SCRIPT, type ThemePref } from "@/lib/theme";
import "./globals.css";

const font = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "NutriTrack", template: "%s · NutriTrack" },
  description: "Quản lý dinh dưỡng cá nhân cho người Việt",
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
