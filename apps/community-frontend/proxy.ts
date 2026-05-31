import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "af_token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isProtectedPage = request.nextUrl.pathname.startsWith("/feed");

  if (isProtectedPage && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/feed/:path*", "/login"],
};
