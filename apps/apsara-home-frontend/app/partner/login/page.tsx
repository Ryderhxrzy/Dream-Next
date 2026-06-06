import { buildPageMetadata } from '@/app/seo'
import AdminLoginForm from '@/components/admin/auth/AdminLoginForm'

export const metadata = buildPageMetadata({
  title: 'Partner Login',
  description: 'Sign in to manage your partner storefront.',
  path: '/partner/login',
  noIndex: true,
})

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PartnerLoginPage({ searchParams }: PageProps) {
  const turnstileSiteKey = process.env.ADMIN_LOGIN_CLOUDFLARE_SITE_KEY ?? ''
  const params = await searchParams
  const reason = String(params?.reason ?? '').trim()
  const isExpired = reason === 'subscription_expired'
  const storeName = String(params?.store ?? '').trim()

  return (
    <>
      {isExpired && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md">
          {storeName
            ? `"${storeName}" storefront subscription has expired. Please renew to regain access.`
            : 'Your storefront subscription has expired. Please renew to regain access.'}
        </div>
      )}
      <AdminLoginForm turnstileSiteKey={turnstileSiteKey} />
    </>
  )
}
