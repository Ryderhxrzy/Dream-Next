"use client"

import { useState } from "react"
import { useAuthStore } from "@/store/auth.store"
import { useRouter } from "next/navigation"

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const setToken = useAuthStore((state) => state.setToken)

  async function login(email: string, password: string) {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.message || "Login failed")
        return
      }

      if (!data?.token) {
        setError("Login response did not include an auth token")
        return
      }

      setToken(data.token)

      router.replace("/feed")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during login"
      )
    } finally {
      setLoading(false)
    }
  }
  return { login, loading, error }
}
