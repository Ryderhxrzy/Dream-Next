// Shared shimmer placeholder for route-level loading skeletons. Keeps loading
// fallbacks looking like the real page (Lazada-style) instead of a blank screen.
export default function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  )
}
