import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "af_token";
const COMMUNITY_BASE_PATH = process.env.NODE_ENV === "production" ? "/community" : "";
const FEED_PATH = "/feed";
const LOGIN_PATH = "/login";

function withCommunityBasePath(pathname: string) {
  if (!COMMUNITY_BASE_PATH || pathname.startsWith(COMMUNITY_BASE_PATH)) {
    return pathname;
  }

  return `${COMMUNITY_BASE_PATH}${pathname}`;
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;
  const isHomePage = pathname === "/";
  const isLoginPage = pathname === LOGIN_PATH;
  const isProtectedPage = pathname.startsWith(FEED_PATH);

  if (isHomePage) {
    if (token) {
      return NextResponse.redirect(new URL(withCommunityBasePath(FEED_PATH), request.url));
    }

    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", withCommunityBasePath(FEED_PATH));

    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedPage && !token) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", withCommunityBasePath(pathname));

    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(new URL(withCommunityBasePath(FEED_PATH), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/feed/:path*", "/login"],
};
