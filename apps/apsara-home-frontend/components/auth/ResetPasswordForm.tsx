"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

import PrimaryButton from "@/components/ui/buttons/PrimaryButton"
import Header from "@/components/landing-page/Header"
import VideoBackground from "@/components/VideoBackground"

type ResetPayload = {
  email: string
  name: string
  expires_at: string
}

type Props = {
  token: string
}

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export default function ResetPasswordForm({ token }: Props) {
  const apiUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "").replace(
    /\/+$/,
    ""
  )
  const [reset, setReset] = useState<ResetPayload | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checks = useMemo(() => getPasswordChecks(password), [password])

  const getFirstApiError = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null
    const errorMap = value as Record<string, unknown>
    const firstEntry = Object.values(errorMap)[0]
    if (Array.isArray(firstEntry) && typeof firstEntry[0] === "string") {
      return firstEntry[0]
    }
    return null
  }

  useEffect(() => {
    let isMounted = true

    const loadReset = async () => {
      if (!apiUrl || !token) {
        if (isMounted) {
          setError("Reset link is invalid.")
          setIsLoading(false)
        }
        return
      }

      try {
        const res = await fetch(
          `${apiUrl}/api/auth/reset-password/${encodeURIComponent(token)}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        )

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || "Reset link is invalid or expired.")
        }

        if (isMounted) {
          setReset(data.reset)
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load reset link."
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadReset()

    return () => {
      isMounted = false
    }
  }, [apiUrl, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (!Object.values(checks).every(Boolean)) {
      setError("Password does not meet the required strength.")
      return
    }

    if (!apiUrl) {
      setError("API URL is not configured.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          password_confirmation: confirmPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const firstError = getFirstApiError(
          (data as { errors?: unknown } | null)?.errors
        )
        throw new Error(
          firstError || data?.message || "Unable to reset password."
        )
      }

      setSuccess(data?.message || "Your password has been reset.")
      setPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden overflow-y-auto">
      <VideoBackground />
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] dark:bg-black/55" />

      <div className="relative z-20">
        <Header cartCount={0} />
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md transition-all duration-300"
        >
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-slate-800">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Reset Password
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-white/70">
                Choose a new password for your AF Home account.
              </p>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                Loading reset details...
              </div>
            ) : error && !reset ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-sm dark:border-red-400/20 dark:bg-red-500/20 dark:text-red-300">
                {error}
              </div>
            ) : reset ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Name:
                    </span>{" "}
                    {reset.name}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Email:
                    </span>{" "}
                    {reset.email}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-white/80">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create your new password"
                    required
                    className="h-11 w-full rounded-[18px] border border-gray-300 bg-white px-4 text-sm text-gray-900 transition-all duration-200 outline-none placeholder:text-gray-400 focus:border-sky-400 focus:bg-white dark:border-white/18 dark:bg-white/12 dark:text-white dark:placeholder:text-white/40 dark:focus:border-sky-400/60 dark:focus:bg-white/18"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-white/80">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    className="h-11 w-full rounded-[18px] border border-gray-300 bg-white px-4 text-sm text-gray-900 transition-all duration-200 outline-none placeholder:text-gray-400 focus:border-sky-400 focus:bg-white dark:border-white/18 dark:bg-white/12 dark:text-white dark:placeholder:text-white/40 dark:focus:border-sky-400/60 dark:focus:bg-white/18"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Password requirements
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li
                      className={
                        checks.length
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-gray-500 dark:text-white/70"
                      }
                    >
                      At least 8 characters
                    </li>
                    <li
                      className={
                        checks.uppercase
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-gray-500 dark:text-white/70"
                      }
                    >
                      At least one uppercase letter
                    </li>
                    <li
                      className={
                        checks.lowercase
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-gray-500 dark:text-white/70"
                      }
                    >
                      At least one lowercase letter
                    </li>
                    <li
                      className={
                        checks.number
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-gray-500 dark:text-white/70"
                      }
                    >
                      At least one number
                    </li>
                    <li
                      className={
                        checks.special
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-gray-500 dark:text-white/70"
                      }
                    >
                      At least one special character
                    </li>
                  </ul>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-sm dark:border-red-400/20 dark:bg-red-500/20 dark:text-red-300">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/20 dark:text-emerald-300">
                    {success}{" "}
                    <Link href="/login" className="font-semibold underline">
                      Go to login
                    </Link>
                  </div>
                ) : null}

                <PrimaryButton
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-5 py-3 text-sm"
                >
                  {isSubmitting ? "Resetting password..." : "Reset Password"}
                </PrimaryButton>
              </form>
            ) : null}

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-white/70">
              <Link
                href="/login"
                className="font-semibold text-sky-500 transition-colors hover:text-sky-400"
              >
                Back to login
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
