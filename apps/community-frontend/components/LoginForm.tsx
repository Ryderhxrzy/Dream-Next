"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useLogin } from "@/lib/hooks/useLogin"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)


  const  { login, loading, error} = useLogin()


  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email, password);
    // TODO: connect to AFHome auth
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="flex lg:hidden items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <span className="font-semibold text-zinc-900 tracking-tight">AF Nexus</span>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Sign in</h1>
        <p className="text-zinc-500 mt-2 text-sm">
          Use your AFHome account to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
            Email or Username
          </Label>
          <Input
            id="email"
            type="text"
            placeholder="you@example.com or username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-900"
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Password
            </Label>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-900 pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-11 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-lg transition-colors mt-1"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-zinc-100" />
        <span className="text-xs text-zinc-400 font-medium">New to AF Nexus?</span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>

      {/* Register note */}
      <p className="text-center text-sm text-zinc-500">
        Create an account at{" "}
        <a
          href="https://www.afhome.ph/login?mode=signup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-900 font-semibold underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-900 transition-colors"
        >
          AFHome
        </a>{" "}
        first, then sign in here.
      </p>

      <p className="text-center text-xs text-zinc-300 mt-10">
        © 2025 AF Nexus · Apsara Home
      </p>
    </div>
  )
}
