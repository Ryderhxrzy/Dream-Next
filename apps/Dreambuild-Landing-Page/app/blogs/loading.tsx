import { Header } from "@/components/shared/header"

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stone-200/70 ${className}`} />
}

export default function BlogsLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <SkeletonBlock className="h-3 w-36 rounded-full" />
            <SkeletonBlock className="mt-5 h-14 w-full max-w-3xl" />
            <SkeletonBlock className="mt-4 h-14 w-full max-w-2xl" />
            <div className="mt-7 space-y-3">
              <SkeletonBlock className="h-4 w-full max-w-3xl rounded-full" />
              <SkeletonBlock className="h-4 w-full max-w-2xl rounded-full" />
            </div>
          </div>
        </div>
      </section>
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
          <SkeletonBlock className="aspect-[4/3]" />
          <div className="flex flex-col justify-center">
            <SkeletonBlock className="h-3 w-44 rounded-full" />
            <SkeletonBlock className="mt-5 h-10 w-full max-w-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full max-w-lg" />
            <div className="mt-6 space-y-3">
              <SkeletonBlock className="h-4 w-full rounded-full" />
              <SkeletonBlock className="h-4 w-3/4 rounded-full" />
            </div>
          </div>
        </div>
      </section>
      <section className="pb-20 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {[0, 1, 2].map((item) => (
              <article key={item}>
                <SkeletonBlock className="aspect-[16/10]" />
                <div className="mt-5 space-y-3">
                  <SkeletonBlock className="h-3 w-36 rounded-full" />
                  <SkeletonBlock className="h-7 w-4/5" />
                  <SkeletonBlock className="h-4 w-full rounded-full" />
                  <SkeletonBlock className="h-4 w-2/3 rounded-full" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
