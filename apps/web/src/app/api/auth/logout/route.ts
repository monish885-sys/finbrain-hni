import { NextResponse } from "next/server";
import { AUTH_COOKIE, ONBOARDING_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(ONBOARDING_COOKIE);
  return response;
}
