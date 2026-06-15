import Cookies from "js-cookie"
import { create } from "zustand"

type AuthState = {
  token: string | null
  setToken: (token: string | null) => void
  loadTokenFromCookie: () => void
}

const getCookieOptions = () => ({
  expires: 7,
  ...(typeof window !== "undefined" &&
  (window.location.hostname === "afhome.ph" ||
    window.location.hostname.endsWith(".afhome.ph"))
    ? { domain: ".afhome.ph" }
    : {}),
})

export const useAuthStore = create<AuthState>((set) => ({
  token: Cookies.get("af_token") ?? null,
  setToken: (token) => {
    if (token) {
      Cookies.set("af_token", token, getCookieOptions())
    } else {
      Cookies.remove("af_token")
      Cookies.remove("af_token", getCookieOptions())
    }

    set({ token })
  },
  loadTokenFromCookie: () => set({ token: Cookies.get("af_token") ?? null }),
}))
