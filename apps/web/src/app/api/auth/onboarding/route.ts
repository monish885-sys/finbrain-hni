import { NextResponse } from "next/server";
import { AUTH_COOKIE, ONBOARDING_COOKIE } from "@/lib/auth";

/** Refresh onboarding cookie after profile/complete steps. */
export async function POST(request: Request) {
  const body = (await request.json()) as { onboardingStatus?: string };
  const response = NextResponse.json({ ok: true });
  if (body.onboardingStatus) {
    response.cookies.set(ONBOARDING_COOKIE, body.onboardingStatus, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }
  // Ensure auth cookie remains
  response.cookies.set(AUTH_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
