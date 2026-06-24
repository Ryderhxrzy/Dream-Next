import RouteProgressBar from "@/components/ui/RouteProgressBar"

// The branded splash is shown only once per session on the home route (see
// HomeSplashOverlay in components/Providers.tsx). On navigation we only show a
// subtle top progress bar — no full-screen splash, no blank white screen.
export default function Loading() {
  return <RouteProgressBar />
}
