"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { AppNavigationLink, AppNavProps } from "@/types";

const links: AppNavigationLink[] = [
  {
    href: "/songs",
    label: "Songs",
    match: (pathname) => pathname.startsWith("/songs"),
  },
  {
    href: "/leaderboard",
    label: "Scores",
    match: (pathname) => pathname.startsWith("/leaderboard"),
  },
  {
    href: "/links",
    label: "Links",
    match: (pathname) => pathname.startsWith("/links"),
  },
  {
    href: "/admin",
    label: "Admin",
    match: (pathname) => pathname.startsWith("/admin"),
  },
  {
    href: "/account",
    label: "Profile",
    match: (pathname) => pathname.startsWith("/account"),
  },
];

export function AppNav({ isAdmin }: AppNavProps) {
  const pathname: string = usePathname();

  return (
    <nav
      className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-10 sm:py-4"
      aria-label="Main navigation"
    >
      <Link
        href="/"
        className="rounded-md px-2 py-2 font-bold tracking-tight text-foreground outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="sm:hidden">JC</span>
        <span className="hidden sm:inline">Jimmy&apos;s Car</span>
      </Link>
      <div className="flex items-center gap-1 rounded-full bg-secondary p-1 text-sm font-medium text-muted-foreground">
        {links
          .filter((link) => link.href !== "/admin" || isAdmin)
          .map((link) => {
            const active: boolean = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "min-h-10 rounded-full px-3 py-2.5 outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-4",
                  active &&
                    "bg-card text-foreground shadow-xs ring-1 ring-foreground/5 hover:bg-card hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
