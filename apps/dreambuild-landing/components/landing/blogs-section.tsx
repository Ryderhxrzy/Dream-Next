"use client";

import Link from "next/link";
import Image from "next/image";
import { blogPosts as defaultBlogPosts } from "@/lib/landing-data";
import type { DreamBuildBlogPost } from "@/lib/dreambuild-cms";
import { FadeUp, SlideInLeft, StaggerContainer, StaggerItem, motion } from "@/components/ui/motion";

const blogImages = [
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=80",
  "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
];

export function BlogsSection({ blogPosts = defaultBlogPosts }: { blogPosts?: DreamBuildBlogPost[] }) {
  const featured = blogPosts[0];
  const rest = blogPosts.slice(1, 3);

  if (!featured) return null;

  return (
    <section className="bg-white py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* Header */}
        <FadeUp className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              Interior Insights
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              Helpful reads for your space.
            </h2>
          </div>
          <Link
            href="/blogs"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--dark)] hover:text-white hover:border-[var(--dark)]"
          >
            View All Articles
            <span>→</span>
          </Link>
        </FadeUp>

        {/* Featured Post */}
        <SlideInLeft className="mt-12 lg:mt-16">
          <Link href={`/blogs/${featured.id}`} className="group block">
            <motion.article
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="grid overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--background)] lg:grid-cols-[1.2fr_1fr]"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto">
                <Image
                  src={featured.image || blogImages[0]}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                {/* Category badge on image */}
                <div className="absolute top-5 left-5">
                  <span className="rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium tracking-widest text-[var(--foreground)] uppercase">
                    {featured.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col justify-between p-8 lg:p-10">
                <div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                    <span>{featured.date}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                    <span>{featured.readTime}</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-medium leading-snug tracking-tight text-[var(--foreground)] lg:text-3xl">
                    {featured.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                    {featured.excerpt}
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
                  <span className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Featured Article
                  </span>
                  <motion.span
                    className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    Read article →
                  </motion.span>
                </div>
              </div>
            </motion.article>
          </Link>
        </SlideInLeft>

        {/* Smaller Posts */}
        <StaggerContainer
          className="mt-4 grid gap-4 sm:grid-cols-2"
          staggerDelay={0.12}
        >
          {rest.map((post, i) => (
            <StaggerItem key={post.id}>
              <Link href={`/blogs/${post.id}`} className="group block h-full">
                <motion.article
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--background)]"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={post.image || blogImages[i + 1]}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium tracking-widest text-[var(--foreground)] uppercase">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span>{post.date}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-medium leading-snug tracking-tight text-[var(--foreground)]">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>

                    <motion.span
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      Read article →
                    </motion.span>
                  </div>
                </motion.article>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom strip */}
        <FadeUp delay={0.15}>
          <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-8">
            <p className="text-sm text-[var(--muted)]">
              Showing <span className="font-medium text-[var(--foreground)]">3</span> of{" "}
              <span className="font-medium text-[var(--foreground)]">{blogPosts.length}</span> articles
            </p>
            <Link
              href="/blogs"
              className="text-sm font-medium text-[var(--foreground)] underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              Browse all →
            </Link>
          </div>
        </FadeUp>

      </div>
    </section>
  );
}
