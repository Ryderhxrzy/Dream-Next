import { create } from "zustand";
import Cookies from "js-cookie";

type AuthState = {
  token: string | null;
  setToken: (token: string | null) => void;
  loadTokenFromCookie: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: Cookies.get("af_token") ?? null,
  setToken: (token) => {
    if (token) {
      Cookies.set("af_token", token, { expires: 7 });
    } else {
      Cookies.remove("af_token");
    }

    set({ token });
  },
  loadTokenFromCookie: () => set({ token: Cookies.get("af_token") ?? null }),
}));
