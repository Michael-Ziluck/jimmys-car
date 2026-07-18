import { NextResponse } from "next/server";

import { flashCookieName } from "@/lib/flash";

export async function POST(): Promise<NextResponse> {
  const response: NextResponse = new NextResponse(null, { status: 204 });
  response.cookies.delete(flashCookieName);
  return response;
}
