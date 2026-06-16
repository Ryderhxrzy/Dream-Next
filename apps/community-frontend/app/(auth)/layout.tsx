import { CountUp } from "@/components/ui/CountUp"

async function getCommunityStats() {
  try {
    const fetchOptions: RequestInit & { next: { revalidate: number } } = {
      next: { revalidate: 300 },
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_AFHOME_API_URL}/api/public/community-stats`,
      fetchOptions
    )
    const data = await res.json()
    return data.total_members ?? 0
  } catch {
    return 0
  }
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const totalMembers = await getCommunityStats()
  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Dark Branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 lg:flex lg:w-1/2">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow accent */}
        <div className="absolute top-0 left-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/3" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
            <svg
              className="h-4 w-4 text-zinc-950"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            AF Nexus
          </span>
        </div>

        {/* Main content */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-zinc-300">
                142 members online now
              </span>
            </div>
            <h2 className="text-4xl leading-tight font-bold tracking-tight text-white">
              Your community,
              <br />
              all in one place.
            </h2>
            <p className="text-base leading-relaxed text-zinc-400">
              Connect with neighbors, discover local events, and stay informed
              about what matters in your area.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-6">
            {[
              { value: <CountUp target={totalMembers} />, label: "Members" },
              { value: "38", label: "Posts today" },
              { value: "6", label: "Events this week" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="space-y-3 rounded-2xl border border-zinc-800 p-5">
            <p className="text-sm leading-relaxed text-zinc-300">
              "Finally a place where our neighborhood can actually talk to each
              other. Found a great plumber in 10 minutes!"
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
                SJ
              </div>
              <div>
                <p className="text-xs font-medium text-white">Sarah J.</p>
                <p className="text-xs text-zinc-500">Maplewood Heights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-xs text-zinc-600">© 2025 AF Nexus · Apsara Home</p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full items-center justify-center bg-white p-8 lg:w-1/2">
        {children}
      </div>
    </div>
  )
}
