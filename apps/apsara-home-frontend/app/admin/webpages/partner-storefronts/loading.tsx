export default function AdminPartnerStorefrontsLoading() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-10 text-center shadow-[0_18px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.1),_transparent_25%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.08),_transparent_26%)]" />
      <div className="relative">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Loading partner storefronts...
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Preparing the storefront workspace and syncing your data.
        </p>
      </div>
    </div>
  )
}
