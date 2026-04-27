import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET ?? process.env.NEXT_AUTH_SECRET });
  const isAuth = !!token;
  const isApiRoute = req.nextUrl.pathname.startsWith("/vault/api");

  if (isApiRoute) return NextResponse.next();

  if (!isAuth) {
    const mainUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "";
    return NextResponse.redirect(`${mainUrl}/login?callbackUrl=/vault`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/vault/:path*"],
};
