"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useGetPublicSecuritySettingsQuery } from "@/store/api/adminSettingsApi"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"

import PrimaryButton from "@/components/ui/buttons/PrimaryButton"
import Header from "@/components/landing-page/Header"
import VideoBackground from "@/components/VideoBackground"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          callback: (token: string) => void
          "expired-callback": () => void
          "error-callback": () => void
          theme?: string
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

type Props = {
  turnstileSiteKey?: string
}

// Mirror the sign-up form's policy so both screens stay in sync with the
// strict_password_policy security setting.
function getPasswordChecks(password: string, strict: boolean) {
  return strict
    ? [
        { label: "At least 8 characters", passed: password.length >= 8 },
        {
          label: "At least one uppercase letter",
          passed: /[A-Z]/.test(password),
        },
        {
          label: "At least one lowercase letter",
          passed: /[a-z]/.test(password),
        },
        { label: "At least one number", passed: /[0-9]/.test(password) },
        {
          label: "At least one special character",
          passed: /[^A-Za-z0-9]/.test(password),
        },
      ]
    : [{ label: "At least 6 characters", passed: password.length >= 6 }]
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  )
}

function OtpInput({
  value,
  onChange,
  length = 4,
  disabled,
  hasError,
  autoFocus,
}: {
  value: string
  onChange: (next: string) => void
  length?: number
  disabled?: boolean
  hasError?: boolean
  autoFocus?: boolean
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus()
  }, [autoFocus])

  const setDigit = (index: number, digit: string) => {
    const chars = value.split("")
    chars[index] = digit
    onChange(chars.join("").replace(/\D/g, "").slice(0, length))
  }

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "")
    if (!digits) {
      setDigit(index, "")
      return
    }
    setDigit(index, digits[digits.length - 1])
    if (index < length - 1) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      e.preventDefault()
      setDigit(index - 1, "")
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length)
    if (!pasted) return
    onChange(pasted)
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`h-14 w-12 rounded-2xl border text-center text-xl font-semibold text-gray-900 transition-all duration-200 outline-none disabled:opacity-60 sm:w-14 dark:text-white ${
            hasError
              ? "border-rose-400 bg-white ring-2 ring-rose-100 dark:border-rose-400/70 dark:bg-white/12 dark:ring-rose-400/15"
              : "border-gray-300 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/18 dark:bg-white/12 dark:focus:border-sky-400/60 dark:focus:ring-sky-400/15"
          }`}
        />
      ))}
    </div>
  )
}

function getFirstApiError(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const errorMap = value as Record<string, unknown>
  const firstEntry = Object.values(errorMap)[0]
  if (Array.isArray(firstEntry) && typeof firstEntry[0] === "string") {
    return firstEntry[0]
  }
  return null
}

export default function ForgotPasswordForm({ turnstileSiteKey = "" }: Props) {
  const router = useRouter()
  const apiUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "").replace(
    /\/+$/,
    ""
  )
  const [identifier, setIdentifier] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [maskedPhone, setMaskedPhone] = useState("")
  const [step, setStep] = useState<"identifier" | "otp" | "password">(
    "identifier"
  )
  const [error, setError] = useState("")
  const [identifierError, setIdentifierError] = useState("")
  const [otpError, setOtpError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string>("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const { data: securitySettings } = useGetPublicSecuritySettingsQuery()
  const strictPassword = securitySettings?.strict_password_policy ?? true
  const passwordRequirements = useMemo(
    () => getPasswordChecks(password, strictPassword),
    [password, strictPassword]
  )
  const hasOtpSession = step !== "identifier"

  useEffect(() => {
    if (!turnstileSiteKey || hasOtpSession) return

    let cancelled = false

    const doRender = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          if (!cancelled) setTurnstileToken(token)
        },
        "expired-callback": () => {
          if (!cancelled) setTurnstileToken("")
        },
        "error-callback": () => {
          if (!cancelled) setTurnstileToken("")
        },
        theme: "auto",
      })
    }

    const SCRIPT_ID = "cf-turnstile-script"
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      document.head.appendChild(script)
    }

    if (window.turnstile) {
      doRender()
    } else {
      script.addEventListener("load", doRender, { once: true })
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = ""
      }
      setTurnstileToken("")
    }
  }, [turnstileSiteKey, hasOtpSession])

  const resetTurnstile = () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
    setTurnstileToken("")
  }

  // Countdown for the "Resend OTP" cooldown — prevents rapid re-sends that
  // would burn SMS credits and spam the user's phone.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError("")
    setIdentifierError("")
    setOtpError("")
    setSuccess("")

    if (!apiUrl) {
      setError("API URL is not configured.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          identifier,
          email: identifier,
          reset_token: resetToken || undefined,
          cf_turnstile_response: turnstileToken || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const firstError = getFirstApiError(
          (data as { errors?: unknown } | null)?.errors
        )
        throw new Error(
          firstError || data?.message || "Unable to send reset OTP."
        )
      }

      if (data?.reset_token) {
        setResetToken(String(data.reset_token))
        setMaskedPhone(String(data.phone ?? ""))
        setSuccess(data?.message || "A password reset OTP has been sent.")
        setResendCooldown(60)
        setOtp("")
        setStep("otp")
      } else {
        setSuccess(
          data?.message ||
            "If that account exists, a password reset OTP has been sent."
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to send reset OTP."
      // On the identifier step show the error inline under the field
      // (e.g. "No account found"); on the OTP step (resend) show it there.
      if (step === "otp") {
        setOtpError(message)
      } else {
        setIdentifierError(message)
      }
      resetTurnstile()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Verify the 4-digit code on its own step, then slide to the new-password
  // screen. The code is NOT consumed here — it is re-checked on final submit.
  const verifyOtp = async (code: string) => {
    setOtpError("")

    if (!apiUrl) {
      setOtpError("API URL is not configured.")
      return
    }

    setIsVerifying(true)
    try {
      const res = await fetch(`${apiUrl}/api/auth/verify-reset-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token: resetToken, otp: code }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const firstError = getFirstApiError(
          (data as { errors?: unknown } | null)?.errors
        )
        throw new Error(
          firstError || data?.message || "Invalid verification code."
        )
      }

      setSuccess("")
      setStep("password")
    } catch (err) {
      setOtpError(
        err instanceof Error ? err.message : "Invalid verification code."
      )
      setOtp("")
    } finally {
      setIsVerifying(false)
    }
  }

  // Auto-verify once all 4 digits are entered.
  useEffect(() => {
    if (step === "otp" && otp.length === 4 && !isVerifying) {
      verifyOtp(otp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (!passwordRequirements.every((req) => req.passed)) {
      setError("Password does not meet the required strength.")
      return
    }

    if (!apiUrl) {
      setError("API URL is not configured.")
      return
    }

    setIsResetting(true)
    try {
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          otp,
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
      setOtp("")
      setPassword("")
      setConfirmPassword("")
      // Auto-redirect to login after a short delay so the user reads the confirmation.
      setTimeout(() => router.push("/login"), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.")
    } finally {
      setIsResetting(false)
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
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-slate-800">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Forgot Password
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-white/70">
                {step === "identifier" &&
                  "Enter your AF Home email, username, or mobile number to receive an SMS OTP."}
                {step === "otp" &&
                  "Enter the 4-digit code we sent to your mobile number."}
                {step === "password" &&
                  "Create a new password for your account."}
              </p>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {step === "identifier" ? (
                <motion.div
                  key="step-identifier"
                  initial={{ opacity: 0, x: 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -36 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <form onSubmit={requestOtp} className="space-y-4">
                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-sm dark:border-red-400/20 dark:bg-red-500/20 dark:text-red-300">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/20 dark:text-emerald-300">
                        {success}
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-white/80">
                        Email, Username, or Mobile
                      </label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value)
                          if (identifierError) setIdentifierError("")
                        }}
                        required
                        aria-invalid={identifierError ? true : undefined}
                        className={`h-11 w-full rounded-[18px] border bg-white px-4 text-sm text-gray-900 transition-all duration-200 outline-none dark:bg-white/12 dark:text-white ${
                          identifierError
                            ? "border-rose-400 ring-2 ring-rose-100 focus:border-rose-400 dark:border-rose-400/70 dark:ring-rose-400/15"
                            : "border-gray-300 focus:border-sky-400 focus:bg-white dark:border-white/18 dark:focus:border-sky-400/60 dark:focus:bg-white/18"
                        }`}
                      />
                      {identifierError && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                          <svg
                            className="mt-px h-3.5 w-3.5 shrink-0"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{identifierError}</span>
                        </p>
                      )}
                    </div>

                    {turnstileSiteKey && (
                      <div className="flex justify-center">
                        <div ref={turnstileRef} />
                      </div>
                    )}

                    <PrimaryButton
                      type="submit"
                      disabled={
                        isSubmitting || (!!turnstileSiteKey && !turnstileToken)
                      }
                      className="w-full px-5 py-3 text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner />
                          Sending OTP...
                        </>
                      ) : (
                        "Send SMS OTP"
                      )}
                    </PrimaryButton>
                  </form>
                </motion.div>
              ) : step === "otp" ? (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, x: 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -36 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-5">
                    {maskedPhone && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                        OTP sent to{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {maskedPhone}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="mb-3 block text-center text-xs font-semibold text-gray-600 dark:text-white/80">
                        Enter the 4-digit code
                      </label>
                      <OtpInput
                        value={otp}
                        onChange={(next) => {
                          setOtp(next)
                          if (otpError) setOtpError("")
                        }}
                        disabled={isVerifying}
                        hasError={!!otpError}
                        autoFocus
                      />
                      <div className="mt-3 flex min-h-[20px] justify-center text-center">
                        {isVerifying ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-300">
                            <Spinner />
                            Verifying code...
                          </span>
                        ) : otpError ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                            <svg
                              className="h-3.5 w-3.5 shrink-0"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {otpError}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => requestOtp()}
                      disabled={
                        isSubmitting || isVerifying || resendCooldown > 0
                      }
                      className="h-11 w-full rounded-full border border-gray-300 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/18 dark:text-white dark:hover:bg-white/10"
                    >
                      {isSubmitting
                        ? "Resending..."
                        : resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : "Resend code"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step-password"
                  initial={{ opacity: 0, x: 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -36 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <form onSubmit={resetPassword} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-white/80">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 w-full rounded-[18px] border border-gray-300 bg-white px-4 text-sm text-gray-900 transition-all duration-200 outline-none focus:border-sky-400 focus:bg-white dark:border-white/18 dark:bg-white/12 dark:text-white dark:focus:border-sky-400/60 dark:focus:bg-white/18"
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
                        required
                        className="h-11 w-full rounded-[18px] border border-gray-300 bg-white px-4 text-sm text-gray-900 transition-all duration-200 outline-none focus:border-sky-400 focus:bg-white dark:border-white/18 dark:bg-white/12 dark:text-white dark:focus:border-sky-400/60 dark:focus:bg-white/18"
                      />
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Password requirements
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-1">
                        {passwordRequirements.map((item) => (
                          <p
                            key={item.label}
                            className={`flex items-center gap-2 text-[11px] ${item.passed ? "text-emerald-600 dark:text-emerald-300" : "text-gray-400 dark:text-white/55"}`}
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${item.passed ? "bg-emerald-400" : "bg-gray-300 dark:bg-white/25"}`}
                            />
                            {item.label}
                          </p>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-sm dark:border-red-400/20 dark:bg-red-500/20 dark:text-red-300">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/20 dark:text-emerald-300">
                        {success} Redirecting to login…{" "}
                        <Link href="/login" className="font-semibold underline">
                          Go now
                        </Link>
                      </div>
                    )}

                    <PrimaryButton
                      type="submit"
                      disabled={isResetting || !!success}
                      className="w-full px-5 py-3 text-sm"
                    >
                      {isResetting ? (
                        <>
                          <Spinner />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </PrimaryButton>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

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
