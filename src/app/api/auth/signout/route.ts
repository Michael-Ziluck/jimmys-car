import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { userSessions } from "@/db/schema";
import { sessionCookieName } from "@/lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const sessionId: string | undefined = (await cookies()).get(
    sessionCookieName,
  )?.value;
  if (sessionId)
    await getDb().delete(userSessions).where(eq(userSessions.id, sessionId));
  const response: NextResponse = NextResponse.redirect(
    new URL("/account", request.url),
  );
  response.cookies.delete(sessionCookieName);
  return response;
}
