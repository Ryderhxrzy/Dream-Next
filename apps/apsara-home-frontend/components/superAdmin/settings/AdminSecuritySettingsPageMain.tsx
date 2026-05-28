'use client'

import { useEffect, useRef, useState } from 'react'
import { showErrorToast, showSuccessToast } from '@/libs/toast'
import {
  useGetAdminSecuritySettingsQuery,
  useUpdateAdminSecuritySettingsMutation,
} from '@/store/api/adminSettingsApi'

export default function AdminSecuritySettingsPageMain() {
  const { data, isFetching } = useGetAdminSecuritySettingsQuery()
  const [saveSettings, { isLoading: isSaving }] = useUpdateAdminSecuritySettingsMutation()
  const hasHydrated = useRef(false)

  const [sessionTimeout, setSessionTimeout] = useState('60')
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5')
  const [passwordMinLength, setPasswordMinLength] = useState('8')
  const [enable2fa, setEnable2fa] = useState(false)
  const [registrationOtpEnabled, setRegistrationOtpEnabled] = useState(true)
  const [strictPasswordPolicy, setStrictPasswordPolicy] = useState(true)
  const [forcePasswordChangeEnabled, setForcePasswordChangeEnabled] = useState(true)

  useEffect(() => {
    if (!data?.settings || hasHydrated.current) return
    const settings = data.settings
    setSessionTimeout(String(settings.session_timeout_minutes ?? 60))
    setMaxLoginAttempts(String(settings.max_login_attempts ?? 5))
    setPasswordMinLength(String(settings.password_min_length ?? 8))
    setEnable2fa(Boolean(settings.enable_2fa))
    setRegistrationOtpEnabled(Boolean(settings.registration_otp_enabled ?? true))
    setStrictPasswordPolicy(Boolean(settings.strict_password_policy ?? true))
    setForcePasswordChangeEnabled(Boolean(settings.force_password_change_enabled ?? true))
    hasHydrated.current = true
  }, [data])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
        <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-600/20" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-600/20" />
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">Settings</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Security Settings</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Adjust authentication limits, session safety, and password rules for the admin platform.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Session & Access</p>
          <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Security Rules</h2>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Session Timeout (minutes)
            <input
              value={sessionTimeout}
              onChange={(event) => setSessionTimeout(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
              placeholder="30"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Max Login Attempts
            <input
              value={maxLoginAttempts}
              onChange={(event) => setMaxLoginAttempts(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
              placeholder="5"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Password Minimum Length
            <input
              value={passwordMinLength}
              onChange={(event) => setPasswordMinLength(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
              placeholder="8"
            />
          </label>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 dark:border-slate-700 dark:from-slate-700/50 dark:to-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Enable 2FA</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Optional security layer for admin logins.</p>
            </div>
            <button
              type="button"
              onClick={() => setEnable2fa((prev) => !prev)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                enable2fa ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-pressed={enable2fa}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  enable2fa ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Registration</p>
          <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Sign-up Settings</h2>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 dark:border-slate-700 dark:from-slate-700/50 dark:to-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email OTP on Registration</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {registrationOtpEnabled
                  ? 'New members must verify their email via OTP.'
                  : 'Email OTP is skipped — accounts are created instantly.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegistrationOtpEnabled((prev) => !prev)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                registrationOtpEnabled ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-pressed={registrationOtpEnabled}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  registrationOtpEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 dark:border-slate-700 dark:from-slate-700/50 dark:to-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Strict Password Policy</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strictPasswordPolicy
                  ? 'Requires 8+ chars, uppercase, number & special character.'
                  : 'Relaxed: 6+ chars minimum only.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStrictPasswordPolicy((prev) => !prev)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                strictPasswordPolicy ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-pressed={strictPasswordPolicy}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  strictPasswordPolicy ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 dark:border-slate-700 dark:from-slate-700/50 dark:to-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Force Password Change for Legacy Accounts</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {forcePasswordChangeEnabled
                  ? 'Members with old passwords are required to set a new one on login.'
                  : 'Disabled — members with old passwords can log in without changing.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForcePasswordChangeEnabled((prev) => !prev)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                forcePasswordChangeEnabled ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-pressed={forcePasswordChangeEnabled}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  forcePasswordChangeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={async () => {
            const sessionTimeoutValue = Number.parseInt(sessionTimeout, 10)
            const maxLoginAttemptsValue = Number.parseInt(maxLoginAttempts, 10)
            const passwordMinLengthValue = Number.parseInt(passwordMinLength, 10)

            if (!Number.isFinite(sessionTimeoutValue) || sessionTimeoutValue < 5 || sessionTimeoutValue > 1440) {
              showErrorToast('Session timeout must be between 5 and 1440 minutes.')
              return
            }
            if (!Number.isFinite(maxLoginAttemptsValue) || maxLoginAttemptsValue < 1 || maxLoginAttemptsValue > 20) {
              showErrorToast('Max login attempts must be between 1 and 20.')
              return
            }
            if (!Number.isFinite(passwordMinLengthValue) || passwordMinLengthValue < 6 || passwordMinLengthValue > 64) {
              showErrorToast('Password minimum length must be between 6 and 64.')
              return
            }

            try {
              const response = await saveSettings({
                session_timeout_minutes: sessionTimeoutValue,
                max_login_attempts: maxLoginAttemptsValue,
                password_min_length: passwordMinLengthValue,
                enable_2fa: enable2fa,
                registration_otp_enabled: registrationOtpEnabled,
                strict_password_policy: strictPasswordPolicy,
                force_password_change_enabled: forcePasswordChangeEnabled,
              }).unwrap()

              setSessionTimeout(String(response.settings.session_timeout_minutes))
              setMaxLoginAttempts(String(response.settings.max_login_attempts))
              setPasswordMinLength(String(response.settings.password_min_length))
              setEnable2fa(Boolean(response.settings.enable_2fa))
              setRegistrationOtpEnabled(Boolean(response.settings.registration_otp_enabled))
              setStrictPasswordPolicy(Boolean(response.settings.strict_password_policy))
              setForcePasswordChangeEnabled(Boolean(response.settings.force_password_change_enabled))
              showSuccessToast(response.message || 'Security settings saved.')
            } catch (error) {
              console.error(error)
              showErrorToast('Failed to save security settings. Please try again.')
            }
          }}
          disabled={isSaving || isFetching}
          className="rounded-full bg-gradient-to-r from-cyan-600 to-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md dark:from-cyan-700 dark:to-sky-600"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
