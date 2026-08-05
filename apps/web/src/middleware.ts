import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPortalId } from "@capstone/types";
import { AUTH_COOKIE, ONBOARDING_COOKIE } from "@/lib/auth";
import { getDefaultAuthenticatedPath } from "@/lib/portals";

const LEGACY_PROTECTED = [
  "/dashboard",
  "/wealth",
  "/firewall",
  "/actions",
  "/architect",
  "/honesty-check",
  "/time-machine",
];

function isProtectedPath(pathname: string): boolean {
  if (LEGACY_PROTECTED.some((p) => pathname.startsWith(p))) return true;
  if (pathname === "/portals") return true;
  if (pathname.startsWith("/onboarding")) return true;
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ? isPortalId(segment) : false;
}

function isOnboardingIncomplete(status: string | undefined): boolean {
  return status === "pending_profile" || status === "pending_accounts";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get(AUTH_COOKIE)?.value === "1";
  const onboarding = request.cookies.get(ONBOARDING_COOKIE)?.value;
  const isProtected = isProtectedPath(pathname);
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Live clients must finish onboarding before portals
  if (
    isAuthenticated &&
    isOnboardingIncomplete(onboarding) &&
    !isOnboardingPath &&
    pathname !== "/login" &&
    pathname !== "/register"
  ) {
    const dest =
      onboarding === "pending_profile" ? "/onboarding/profile" : "/onboarding/connect";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Completed clients hitting onboarding → dashboard
  if (isAuthenticated && onboarding === "complete" && isOnboardingPath) {
    return NextResponse.redirect(new URL("/owner/dashboard", request.url));
  }

  if (isAuthPage && isAuthenticated && onboarding === "complete") {
    return NextResponse.redirect(new URL(getDefaultAuthenticatedPath(), request.url));
  }

  if (pathname === "/" && isAuthenticated) {
    if (isOnboardingIncomplete(onboarding)) {
      return NextResponse.redirect(
        new URL(onboarding === "pending_profile" ? "/onboarding/profile" : "/onboarding/connect", request.url),
      );
    }
    return NextResponse.redirect(new URL(getDefaultAuthenticatedPath(), request.url));
  }

  if (pathname === "/" && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/onboarding/:path*",
    "/portals",
    "/dashboard/:path*",
    "/wealth/:path*",
    "/firewall/:path*",
    "/actions/:path*",
    "/architect/:path*",
    "/honesty-check/:path*",
    "/time-machine/:path*",
    "/owner/:path*",
    "/family/:path*",
    "/investor/:path*",
    "/ca/:path*",
    "/rm/:path*",
    "/successor/:path*",
  ],
};
