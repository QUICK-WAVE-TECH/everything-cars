import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/customer/",
  "/owner/",
];

const authPaths = [
  "/sign-in",
  "/sign-up",
  "/owner-sign-up",
  "/get-started",
  "/verify",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const refreshToken = request.cookies.get("refresh_token")?.value;
  const isAuthenticated = !!refreshToken;

  if (isAuthenticated && authPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/customer/dashboard", request.url));
  }

  if (!isAuthenticated && protectedPaths.some((p) => pathname.startsWith(p))) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/customer/:path*",
    "/owner/:path*",
    "/sign-in",
    "/sign-up",
    "/owner-sign-up",
    "/get-started",
    "/verify",
  ],
};
