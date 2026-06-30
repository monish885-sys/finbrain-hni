import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPortalId } from "@capstone/types";
import { AUTH_COOKIE } from "@/lib/auth";
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
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ? isPortalId(segment) : false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = isProtectedPath(pathname);
  const isAuthenticated = request.cookies.get(AUTH_COOKIE)?.value === "1";

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL(getDefaultAuthenticatedPath(), request.url));
  }

  if (pathname === "/" && isAuthenticated) {
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
