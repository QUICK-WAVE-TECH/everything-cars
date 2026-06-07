import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/customer/",
  "/owner/",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In local development, skip all auth gating so pages can be viewed
  // without signing in. Production behaviour is unchanged.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get("refresh_token")?.value;
  const isAuthenticated = !!refreshToken;

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
  ],
};
