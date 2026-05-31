"use client";

import Cookies from "js-cookie";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuthStore } from "@/store/auth.store";

const AUTH_COOKIE = "af_token";

// Redirect to AF Home login — full page navigation since it's a different Next.js app
function redirectToLogin(next: string) {
  window.location.replace(`/login?next=${encodeURIComponent(next)}`);
}

export function CommunityAuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setToken = useAuthStore((state) => state.setToken);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    function verifyAuth() {
      const token = Cookies.get(AUTH_COOKIE) ?? null;

      if (!token) {
        setToken(null);
        setIsAllowed(false);
        // Redirect to AF Home login with community feed as the next destination
        redirectToLogin("/community/feed");
        return;
      }

      setToken(token);
      setIsAllowed(true);
    }

    verifyAuth();

    window.addEventListener("pageshow", verifyAuth);
    window.addEventListener("focus", verifyAuth);

    return () => {
      window.removeEventListener("pageshow", verifyAuth);
      window.removeEventListener("focus", verifyAuth);
    };
  }, [pathname, setToken]);

  if (!isAllowed) {
    return null;
  }

  return children;
}
