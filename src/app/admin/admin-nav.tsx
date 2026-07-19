"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { NavigationLink } from "@/types";

const links: NavigationLink[] = [
  { href: "/admin", label: "Song review" },
  { href: "/admin/matches", label: "Potential matches" },
  { href: "/admin/users", label: "People" },
  { href: "/admin/imports", label: "Imports" },
  { href: "/admin/links", label: "Links" },
];

export function AdminNav() {
  const pathname: string = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className="mt-8 border-b border-stone-200"
    >
      <div className="flex gap-7">
        {links.map((link) => {
          const active: boolean =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative -mb-px min-h-11 border-b-2 border-transparent px-0.5 py-3 text-sm font-semibold text-stone-600 outline-none transition-colors hover:border-stone-300 hover:text-stone-950 focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50",
                active && "border-amber-700 text-amber-800",
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
