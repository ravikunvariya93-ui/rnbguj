import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    // APIs must get JSON 401, not an HTML redirect to /login
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
