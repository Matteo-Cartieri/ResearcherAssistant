import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicApiRoute = pathname.startsWith("/api/signup");
  const isInternalRequest = req.headers.get("x-internal-api-token") === process.env.INTERNAL_API_TOKEN;

  // allow authenticated internal service requests
  if (isInternalRequest) {
    return NextResponse.next();
  }

  if (!isLoggedIn && isApiRoute && !isPublicApiRoute) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // if the user is not logged in, redirect to login
  if (!isLoggedIn && !isPublicPath && !isApiRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // if the user is logged in and tries to access a public path, redirect to home
  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};