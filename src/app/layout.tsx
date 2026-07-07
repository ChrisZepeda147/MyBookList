import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito, Playfair_Display } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-reading-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MyBookList — Track Your Reading",
  description:
    "A clean, modern book tracking app. Search, rate, and organize your reading list.",
};

export const viewport: Viewport = {
  width: 1200,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="viewport"
          content="width=1200, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
