"use client";

import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuthStore } from "@/store/auth.store";

const AUTH_COOKIE = "af_token";

export function CommunityAuthGuard({ children }: { children: ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const setToken  = useAuthStore((state) => state.setToken);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    function verifyAuth() {
      const token = Cookies.get(AUTH_COOKIE) ?? null;

      if (!token) {
        setToken(null);
        setIsAllowed(false);
        // Use Next.js router — respects basePath (/community in prod)
        // So this becomes /community/login automatically in production
        router.replace("/login");
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

  if (!isAllowed) return null;

  return children;
}
