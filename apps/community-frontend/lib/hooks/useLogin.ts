"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Cookies from "js-cookie";

export function useLogin() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function login (email: string, password: string)  {
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_AFHOME_API_URL}/api/auth/mobile/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Login failed");
                return;
            }

            Cookies.set("af_token", data.token, { expires: 7 });

            router.push("/feed");
        } catch(error) {
            setError("An error occurred during login");
        } finally {
            setLoading(false);
        }
    }
    return { login, loading, error };
}   