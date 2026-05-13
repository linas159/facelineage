import type { Metadata, Viewport } from "next";
import { Outfit, Signika } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Facelineage — Discover your ancestry from a single photo",
  description:
    "AI-powered heritage analysis. Upload a selfie, discover where in the world your face comes from.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Facelineage",
    description: "Discover your ancestry from a single photo.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${signika.variable}`}>
      <body>{children}</body>
    </html>
  );
}
