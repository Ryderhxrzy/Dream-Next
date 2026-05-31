"use client";

import Cookies from "js-cookie";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuthStore } from "@/store/auth.store";

const AUTH_COOKIE = "af_token";

export function CommunityAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setToken = useAuthStore((state) => state.setToken);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    function verifyAuth() {
      const token = Cookies.get(AUTH_COOKIE) ?? null;

      if (!token) {
        setToken(null);
        setIsAllowed(false);
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
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
  }, [pathname, router, setToken]);

  if (!isAllowed) {
    return null;
  }

  return children;
}
