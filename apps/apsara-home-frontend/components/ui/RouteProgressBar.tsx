// Lightweight route-transition indicator used as the Suspense fallback in
// loading.tsx files. It is intentionally NOT the full-screen branded splash
// (see HomeSplashOverlay in components/Providers.tsx) — just a subtle top bar
// so navigation never flashes a blank white screen or a heavy splash.
export default function RouteProgressBar() {
  return (
    <div
      id="af-route-progress"
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-[#2c5f4f]/10 dark:bg-slate-800"
    >
      <div className="animate-loading-sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#2c5f4f] to-transparent dark:via-cyan-300" />
    </div>
  )
}
