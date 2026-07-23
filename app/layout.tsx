import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_PACKAGE_VERSION, APP_VERSION } from "./app-version";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Burns Travel Planner " + APP_VERSION,
  description:
    "A reusable family trip planner, seeded with the Michigan Lake Week itinerary. Build " + APP_PACKAGE_VERSION + ".",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/app-logo.png",
  },
  openGraph: {
    title: "Burns Travel Planner " + APP_VERSION,
    description:
      "Michigan Lake Week itinerary, packing, places, notes, and future trip planning. Build " + APP_PACKAGE_VERSION + ".",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Burns Travel Planner " + APP_VERSION,
    description:
      "Michigan Lake Week itinerary, packing, places, notes, and future trip planning. Build " + APP_PACKAGE_VERSION + ".",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
