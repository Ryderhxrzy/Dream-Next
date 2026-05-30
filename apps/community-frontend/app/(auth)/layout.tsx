export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Dark Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-950 flex-col justify-between p-12 overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow accent */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <svg className="w-4 h-4 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">AF Nexus</span>
        </div>

        {/* Main content */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-300 text-xs font-medium">142 neighbors active now</span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Your community,<br />all in one place.
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Connect with neighbors, discover local events, and stay informed about what matters in your area.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-6">
            {[
              { value: "2,847", label: "Members" },
              { value: "38", label: "Posts today" },
              { value: "6", label: "Events this week" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="border border-zinc-800 rounded-2xl p-5 space-y-3">
            <p className="text-zinc-300 text-sm leading-relaxed">
              "Finally a place where our neighborhood can actually talk to each other. Found a great plumber in 10 minutes!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-white">
                SJ
              </div>
              <div>
                <p className="text-white text-xs font-medium">Sarah J.</p>
                <p className="text-zinc-500 text-xs">Maplewood Heights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-zinc-600 text-xs">© 2025 AF Nexus · Apsara Home</p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        {children}
      </div>
    </div>
  )
}
