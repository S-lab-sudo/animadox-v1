import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/toaster-provider";
import { RootLayoutClient } from "./layout-client";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AniMaDox - Manga, Manhwa, Anime & More",
  description: "Your ultimate destination for manga, manhwa, anime, novels, and manhua",
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
        <Analytics />
        <ToasterProvider />
      </body>
    </html>
  );
}
