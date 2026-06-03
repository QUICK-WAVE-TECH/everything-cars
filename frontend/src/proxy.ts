import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/listings",
  "/requests",
  "/payments",
  "/transactions",
  "/my-cars",
  "/loyalty",
  "/notifications",
  "/profile",
];

const authPaths = ["/sign-in", "/sign-up", "/get-started", "/verify"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const refreshToken = request.cookies.get("refresh_token")?.value;
  const isAuthenticated = !!refreshToken;

  if (isAuthenticated && authPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
