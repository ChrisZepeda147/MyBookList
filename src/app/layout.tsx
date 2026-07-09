import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Quicksand } from "next/font/google";
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

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MyBookList — Track Your Reading",
  description:
    "A clean, modern book tracking app. Search, rate, and organize your reading list.",
};

export const viewport: Viewport = {
  width: "device-width",
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
      className={`${geistSans.variable} ${geistMono.variable} ${quicksand.variable} h-full w-full antialiased`}
    >
      <body className="flex min-h-full w-full max-w-full flex-col overflow-x-hidden bg-slate-50 text-slate-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
