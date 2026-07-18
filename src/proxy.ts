import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { flashCookieName } from "@/lib/flash";
import type { ProxyMatcherConfig } from "@/types";

/** Render an account flash once, then clear it in the same response. */
export function proxy(request: NextRequest): NextResponse {
  const response: NextResponse = NextResponse.next();
  if (request.cookies.has(flashCookieName)) {
    response.cookies.delete(flashCookieName);
  }
  return response;
}

export const config: ProxyMatcherConfig = { matcher: "/account" };
