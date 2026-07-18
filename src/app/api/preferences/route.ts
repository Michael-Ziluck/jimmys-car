import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { SongPreferenceRequest } from "@/types";

export async function GET(): Promise<Response> {
  const user: Awaited<ReturnType<typeof getCurrentUser>> =
    await getCurrentUser();
  return Response.json(
    {
      songView: user?.songView === "list" ? "list" : "cards",
      isPersonalized: Boolean(user),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PATCH(request: Request): Promise<Response> {
  const user: Awaited<ReturnType<typeof getCurrentUser>> =
    await getCurrentUser();
  if (!user)
    return Response.json({ error: "Sign in required." }, { status: 401 });

  const body: SongPreferenceRequest =
    (await request.json()) as SongPreferenceRequest;
  if (body.songView !== "cards" && body.songView !== "list") {
    return Response.json({ error: "Choose cards or list." }, { status: 400 });
  }

  await getDb()
    .update(appUsers)
    .set({ songView: body.songView, updatedAt: new Date() })
    .where(eq(appUsers.id, user.id));
  return Response.json({ ok: true, songView: body.songView });
}
