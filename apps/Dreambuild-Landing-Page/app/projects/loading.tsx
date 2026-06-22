import { Header } from "@/components/shared/header"

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stone-200/70 ${className}`} />
}

export default function ProjectsLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="mt-5 h-14 w-full max-w-2xl" />
            <SkeletonBlock className="mt-4 h-14 w-full max-w-xl" />
            <div className="mt-7 space-y-3">
              <SkeletonBlock className="h-4 w-full max-w-3xl rounded-full" />
              <SkeletonBlock className="h-4 w-full max-w-2xl rounded-full" />
              <SkeletonBlock className="h-4 w-3/4 rounded-full" />
            </div>
          </div>
        </div>
      </section>
      <section className="pb-20 lg:pb-32">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-2 lg:gap-12 lg:px-8">
          {[0, 1, 2, 3].map((item) => (
            <article key={item} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
              <SkeletonBlock className="aspect-[4/3] rounded-none" />
              <div className="space-y-4 p-6 lg:p-8">
                <SkeletonBlock className="h-3 w-1/2 rounded-full" />
                <SkeletonBlock className="h-7 w-3/4" />
                <SkeletonBlock className="h-4 w-full rounded-full" />
                <SkeletonBlock className="h-4 w-2/3 rounded-full" />
                <div className="flex gap-2 pt-2">
                  <SkeletonBlock className="h-7 w-20 rounded-full" />
                  <SkeletonBlock className="h-7 w-24 rounded-full" />
                  <SkeletonBlock className="h-7 w-28 rounded-full" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
