import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import type { LayoutProps } from "@/types";

import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: Readonly<LayoutProps>) {
  const user: Awaited<ReturnType<typeof getCurrentUser>> =
    await getCurrentUser();
  if (user?.role !== "admin") redirect("/songs");

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
        Admin
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
        Manage Jimmy&apos;s Car
      </h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Review song submissions, manage access, and keep member profiles up to
        date.
      </p>
      <AdminNav />
      <div className="pt-8">{children}</div>
    </main>
  );
}
