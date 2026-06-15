import Image from "next/image"
import Link from "next/link"

import { getDreamBuildContent } from "@/lib/dreambuild-cms"
import {
  FadeIn,
  FadeUp,
  SlideInLeft,
  SlideInRight,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion"
import { Header } from "@/components/shared/header"

export const dynamic = "force-dynamic"

export default async function BlogsPage() {
  const { blogPosts } = await getDreamBuildContent()
  const featuredPost = blogPosts[0]
  const otherPosts = blogPosts.slice(1)
  const fallbackImages = [
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=80",
    "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
  ]

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <FadeUp>
              <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                Interior Insights
              </p>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h1 className="mt-4 text-4xl font-medium tracking-tight text-balance text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Helpful reads for planning and styling your space
              </h1>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
                Explore our collection of design insights, styling guides, and
                practical tips to help you create spaces that feel both
                beautiful and livable.
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <article className="group">
            <Link href={`/blogs/${featuredPost.id}`} className="block">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <SlideInLeft>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image
                      src={featuredPost.image || fallbackImages[0]}
                      alt={featuredPost.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </SlideInLeft>
                <SlideInRight className="flex flex-col justify-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                      {featuredPost.category}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                    <span className="text-xs text-[var(--muted)]">
                      {featuredPost.date}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-medium tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] sm:text-3xl lg:text-4xl">
                    {featuredPost.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                    {featuredPost.excerpt}
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                      Read article
                      <svg
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </span>
                    <span className="text-sm text-[var(--muted)]">
                      {featuredPost.readTime}
                    </span>
                  </div>
                </SlideInRight>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="pb-20 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeUp>
            <h2 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              All Articles
            </h2>
          </FadeUp>
          <StaggerContainer className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {otherPosts.map((post, index) => (
              <StaggerItem key={post.id}>
                <article className="group">
                  <Link href={`/blogs/${post.id}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                      <Image
                        src={
                          post.image ||
                          fallbackImages[(index + 1) % fallbackImages.length]
                        }
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                          {post.category}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span className="text-xs text-[var(--muted)]">
                          {post.date}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-medium tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
                        {post.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                        {post.excerpt}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                          Read article
                          <svg
                            className="h-4 w-4 transition-transform group-hover:translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {post.readTime}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="border-t border-[var(--border)] bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <FadeUp>
            <h2 className="text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Stay inspired
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
              Subscribe to our newsletter for the latest design insights,
              project reveals, and styling tips delivered to your inbox.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <form className="mx-auto mt-10 flex max-w-md flex-col gap-4 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-5 py-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--foreground)] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-[var(--dark)] px-6 py-3.5 text-sm font-medium text-white transition-all hover:bg-[var(--dark-muted)]"
              >
                Subscribe
              </button>
            </form>
          </FadeUp>
        </div>
      </section>

      {/* Footer */}
      <FadeIn>
        <footer className="border-t border-[var(--border)] bg-[var(--background)] py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-[var(--muted)]">
                &copy; {new Date().getFullYear()} Dreambuild Design Studio. All
                rights reserved.
              </p>
              <Link
                href="/"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </footer>
      </FadeIn>
    </main>
  )
}
