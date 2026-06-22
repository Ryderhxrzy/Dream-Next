import { Header } from "@/components/shared/header"

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stone-200/70 ${className}`} />
}

export default function ProjectDetailLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <section className="pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <div className="mt-8 flex flex-wrap gap-3">
            <SkeletonBlock className="h-6 w-36 rounded-full" />
            <SkeletonBlock className="h-6 w-28 rounded-full" />
            <SkeletonBlock className="h-6 w-40 rounded-full" />
          </div>
          <SkeletonBlock className="mt-6 h-16 w-full max-w-4xl" />
          <SkeletonBlock className="mt-4 h-16 w-full max-w-3xl" />
          <div className="mt-8 space-y-3">
            <SkeletonBlock className="h-4 w-full max-w-3xl rounded-full" />
            <SkeletonBlock className="h-4 w-full max-w-2xl rounded-full" />
          </div>
        </div>
      </section>
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SkeletonBlock className="aspect-[16/9] w-full" />
        </div>
      </section>
      <section className="pb-20 lg:pb-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div className="space-y-8">
            {[0, 1, 2].map((item) => (
              <div key={item}>
                <SkeletonBlock className="h-3 w-28 rounded-full" />
                <SkeletonBlock className="mt-4 h-8 w-48 rounded-full" />
              </div>
            ))}
          </div>
          <div className="border-l border-[var(--border)] pl-6 lg:pl-10">
            <SkeletonBlock className="h-3 w-36 rounded-full" />
            <div className="mt-5 space-y-3">
              {[0, 1, 2, 3, 4].map((item) => (
                <SkeletonBlock key={item} className="h-4 w-full rounded-full" />
              ))}
              <SkeletonBlock className="h-4 w-3/4 rounded-full" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
