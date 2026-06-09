import { NextResponse } from "next/server";

/**
 * Proxy (middleware) — currently a pass-through.
 *
 * Auth protection is handled client-side by AuthGuard, because the
 * refresh_token cookie lives on the API domain (onrender.com) and
 * is invisible to the Vercel middleware running on vercel.app.
 *
 * If frontend and backend share the same domain in the future,
 * server-side redirect logic can be re-enabled here.
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/customer/:path*",
    "/owner/:path*",
  ],
};
