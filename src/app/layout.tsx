import type { Metadata, Viewport } from "next";
import { Outfit, Signika } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { PixelLoader } from "@/lib/meta/pixel-loader";
import { PostHogProvider } from "@/lib/posthog/provider";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const signika = Signika({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-signika",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fff5e8",
};

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ),
    openGraph: {
      title: "Facelineage",
      description: dict.meta.description,
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <html lang={locale} className={`${outfit.variable} ${signika.variable}`}>
      <body>
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
        <Suspense fallback={null}>
          <PixelLoader />
          <PostHogProvider />
        </Suspense>
      </body>
    </html>
  );
}
