import { Header } from "@/components/shared/header"

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stone-200/70 ${className}`} />
}

export default function BlogDetailLoading() {
  return (
    <main className="min-h-screen bg-[#f8f5f0]">
      <Header />
      <article className="pt-32 lg:pt-40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)] lg:items-end">
            <div>
              <SkeletonBlock className="h-7 w-56 rounded-full" />
              <SkeletonBlock className="mt-7 h-16 w-full max-w-2xl" />
              <SkeletonBlock className="mt-4 h-16 w-full max-w-xl" />
              <div className="mt-7 space-y-3">
                <SkeletonBlock className="h-4 w-full rounded-full" />
                <SkeletonBlock className="h-4 w-4/5 rounded-full" />
              </div>
            </div>
            <SkeletonBlock className="aspect-[4/3] rounded-[2rem]" />
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:px-8 lg:py-24">
          <aside className="hidden lg:block">
            <SkeletonBlock className="h-72 rounded-[1.5rem]" />
          </aside>
          <div>
            <SkeletonBlock className="h-48 rounded-[1.75rem]" />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <SkeletonBlock key={item} className="h-32 rounded-[1.25rem]" />
              ))}
            </div>
            <div className="mt-12 space-y-5">
              {[0, 1, 2, 3, 4].map((item) => (
                <SkeletonBlock key={item} className="h-4 w-full rounded-full" />
              ))}
              <SkeletonBlock className="h-4 w-3/4 rounded-full" />
            </div>
          </div>
          <aside>
            <SkeletonBlock className="h-64 rounded-[1.5rem]" />
          </aside>
        </div>
      </article>
    </main>
  )
}
