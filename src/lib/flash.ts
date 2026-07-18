import "server-only";

import type { NextResponse } from "next/server";

export const flashCookieName: string = "jimmys_car_flash";

export type FlashMessage = { kind: "success" | "error"; message: string };

function setFlash(response: NextResponse, flash: FlashMessage): void {
  response.cookies.set(flashCookieName, JSON.stringify(flash), {
    httpOnly: true,
    maxAge: 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function setErrorFlash(response: NextResponse, message: string): void {
  setFlash(response, { kind: "error", message });
}

export function setSuccessFlash(response: NextResponse, message: string): void {
  setFlash(response, { kind: "success", message });
}

export function readFlash(value: string | undefined): FlashMessage | null {
  if (!value) return null;
  try {
    const parsed: FlashMessage = JSON.parse(value) as FlashMessage;
    return (parsed.kind === "success" || parsed.kind === "error") &&
      typeof parsed.message === "string"
      ? parsed
      : null;
  } catch {
    return { kind: "error", message: value };
  }
}
