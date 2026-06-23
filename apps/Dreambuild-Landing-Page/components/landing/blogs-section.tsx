"use client"

import Image from "next/image"
import Link from "next/link"

import type { DreamBuildBlogPost } from "@/lib/dreambuild-cms"
import {
  FadeUp,
  motion,
  SlideInLeft,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion"

export function BlogsSection({
  blogPosts = [],
}: {
  blogPosts?: DreamBuildBlogPost[]
}) {
  const featured = blogPosts[0]
  const rest = blogPosts.slice(1, 4)

  if (!featured) return null

  return (
    <section className="bg-[#f8f5f0] py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeUp className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              Dreambuild Journal
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              Design notes for rooms with intention.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
              Editorial guides, room-planning ideas, and finish decisions you
              can shape from the CMS.
            </p>
          </div>
          <Link
            href="/blogs"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--dark)] hover:bg-[var(--dark)] hover:text-white"
          >
            View All Articles
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </FadeUp>

        <SlideInLeft className="mt-12 lg:mt-16">
          <Link href={`/blogs/${featured.id}`} className="group block">
            <motion.article
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="grid overflow-hidden rounded-[2rem] border border-[#e4d8ca] bg-white shadow-[0_24px_80px_rgba(64,48,36,0.08)] lg:grid-cols-[1.15fr_0.85fr]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#efeae3] to-[#d8cfc4] lg:aspect-auto">
                {featured.image && (
                  <Image
                    src={featured.image}
                    alt={featured.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                <div className="absolute top-5 left-5">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium tracking-widest text-[var(--foreground)] uppercase backdrop-blur-sm">
                    {featured.category}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between p-8 lg:p-10">
                <div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                    <span>{featured.date}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                    <span>{featured.readTime}</span>
                  </div>
                  <h3 className="mt-5 text-2xl leading-snug font-medium tracking-tight text-[var(--foreground)] lg:text-3xl">
                    {featured.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                    {featured.excerpt}
                  </p>
                  {(featured.takeaways?.length ?? 0) > 0 && (
                    <div className="mt-6 grid gap-2">
                      {featured.takeaways?.slice(0, 3).map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-[#f5f0e8] px-4 py-2 text-xs font-medium text-[#6e5b4a]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
                  <span className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Featured Guide
                  </span>
                  <motion.span
                    className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    Read article -&gt;
                  </motion.span>
                </div>
              </div>
            </motion.article>
          </Link>
        </SlideInLeft>

        <StaggerContainer
          className="mt-5 grid gap-5 md:grid-cols-3"
          staggerDelay={0.12}
        >
          {rest.map((post) => (
            <StaggerItem key={post.id}>
              <Link href={`/blogs/${post.id}`} className="group block h-full">
                <motion.article
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[#e4d8ca] bg-white"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#efeae3] to-[#d8cfc4]">
                    {post.image && (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium tracking-widest text-[var(--foreground)] uppercase backdrop-blur-sm">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span>{post.date}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="mt-3 text-lg leading-snug font-medium tracking-tight text-[var(--foreground)]">
                        {post.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                        {post.excerpt}
                      </p>
                    </div>

                    <motion.span
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      Open guide -&gt;
                    </motion.span>
                  </div>
                </motion.article>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeUp delay={0.15}>
          <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-8">
            <p className="text-sm text-[var(--muted)]">
              Showing{" "}
              <span className="font-medium text-[var(--foreground)]">
                {Math.min(4, blogPosts.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[var(--foreground)]">
                {blogPosts.length}
              </span>{" "}
              articles
            </p>
            <Link
              href="/blogs"
              className="text-sm font-medium text-[var(--foreground)] underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              Browse all -&gt;
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
