import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// eslint-disable-next-line @typescript-eslint/typedef -- The loader's inferred type retains the variable field.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// eslint-disable-next-line @typescript-eslint/typedef -- The loader's inferred type retains the variable field.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jimmy's Car",
  description: "Songs, rankings, and history from Jimmy's Car.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-10" aria-label="Main navigation">
            <Link href="/" className="font-bold tracking-tight text-stone-950">
              Jimmy&apos;s Car
            </Link>
            <div className="flex gap-5 text-sm font-medium text-stone-600">
              <Link href="/songs" className="transition hover:text-amber-700">Songs</Link>
              <Link href="/admin" className="transition hover:text-amber-700">Admin</Link>
              <Link href="/account" className="transition hover:text-amber-700">Profile</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
