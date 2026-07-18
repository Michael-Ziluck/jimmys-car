import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import { getCurrentUser } from "@/lib/auth";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user: Awaited<ReturnType<typeof getCurrentUser>> =
    await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-stone-950 px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
          <AppNav isAdmin={user?.role === "admin"} />
        </header>
        {children}
      </body>
    </html>
  );
}
