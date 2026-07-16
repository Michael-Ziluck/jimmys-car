import { Card, CardContent } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Admin</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">Weekly controls</h1>
      <Card className="mt-8 rounded-2xl border-dashed bg-card/70 py-0 text-center">
        <CardContent className="p-10">
          <p className="text-lg font-semibold text-foreground">Admin tools will live here.</p>
          <p className="mt-2 text-muted-foreground">Authentication, swaps, and integrations are intentionally out of scope for this prototype.</p>
        </CardContent>
      </Card>
    </main>
  );
}
