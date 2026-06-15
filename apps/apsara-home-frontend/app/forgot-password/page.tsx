import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Forgot Password",
  description: "Request a password reset for your AF Home account.",
  path: "/forgot-password",
  noIndex: true,
})

export default function ForgotPasswordPage() {
  const turnstileSiteKey =
    process.env.USER_FORGOT_PASSWORD_CLOUDFLARE_SITE_KEY ?? ""
  return <ForgotPasswordForm turnstileSiteKey={turnstileSiteKey} />
}
