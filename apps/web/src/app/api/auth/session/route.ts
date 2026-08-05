import { NextResponse } from "next/server";
import { AUTH_COOKIE, ONBOARDING_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    mode?: "live" | "demo";
    onboardingStatus?: string;
  };

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  const onboarding = body.mode === "demo" ? "complete" : (body.onboardingStatus ?? "pending_profile");
  response.cookies.set(ONBOARDING_COOKIE, onboarding, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
