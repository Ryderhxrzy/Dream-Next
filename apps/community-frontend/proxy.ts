import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "af_token";
const FEED_PATH = "/feed";
const LOGIN_PATH = "/login";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;

  const isHomePage = pathname === "/";
  const isLoginPage = pathname === LOGIN_PATH;
  const isProtectedPage = pathname.startsWith(FEED_PATH);

  // Home → feed (logged in) or community login (not)
  if (isHomePage) {
    const url = request.nextUrl.clone();
    url.pathname = token ? FEED_PATH : LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  // Protected page + no token → community login (NOT AFHome login)
  if (isProtectedPage && !token) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  // Already logged in + on login page → straight to feed
  if (isLoginPage && token) {
    const url = request.nextUrl.clone();
    url.pathname = FEED_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/feed/:path*", "/login"],
};
