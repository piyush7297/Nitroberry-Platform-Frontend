import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.NEXT_AUTH_SECRET,
    cookieName: "nitroberry.session-token",
  });

  const isAuth = !!token;
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  if (!isAuth) {
    const mainUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "http://localhost:3000";
    const loginUrl = new URL("/login", mainUrl);
    loginUrl.searchParams.set("callbackUrl", "/management");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
