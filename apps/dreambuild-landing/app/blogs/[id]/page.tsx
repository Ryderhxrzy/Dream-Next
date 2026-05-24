import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/shared/header";
import { getDreamBuildContent } from "@/lib/dreambuild-cms";
import { FadeUp, FadeIn, ScaleUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

type BlogPostPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;
  const { blogPosts } = await getDreamBuildContent();
  const post = blogPosts.find((p) => p.id === id);

  if (!post) {
    notFound();
  }

  const postIndex = blogPosts.findIndex((p) => p.id === id);
  const relatedPosts = blogPosts.filter((_, index) => index !== postIndex).slice(0, 2);
  const fallbackImages = [
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=80",
    "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
  ];

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />

      {/* Article Header */}
      <article className="pt-32 lg:pt-40">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <FadeUp>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Back to Blog
            </Link>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                {post.category}
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">{post.date}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">{post.readTime}</span>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <h1 className="mt-6 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl text-balance">
              {post.title}
            </h1>
          </FadeUp>

          <FadeUp delay={0.3}>
            <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
              {post.excerpt}
            </p>
          </FadeUp>
        </div>

        {/* Featured Image */}
        <div className="mx-auto mt-12 max-w-5xl px-6 lg:px-8">
          <ScaleUp delay={0.4}>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
              <Image
                src={post.image || fallbackImages[0]}
                alt={post.title}
                fill
                className="object-cover"
              />
            </div>
          </ScaleUp>
        </div>

        {/* Article Content */}
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
          <FadeUp delay={0.5}>
            <div className="prose prose-lg prose-neutral max-w-none">
              <p className="text-base leading-relaxed text-[var(--muted)]">
                {post.body ||
                  "Creating a space that feels both modern and warm requires a careful balance of materials, colors, and textures. The key is to start with a neutral foundation and layer in elements that add personality without overwhelming the senses."}
              </p>

              <h2 className="mt-12 text-2xl font-medium tracking-tight text-[var(--foreground)]">
                Starting with the Foundation
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                Every successful interior begins with a solid foundation. This means selecting the right 
                flooring, wall treatments, and base furniture pieces that will anchor your design. 
                Consider materials that age gracefully and can adapt to evolving styles over time.
              </p>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                Natural materials like oak, walnut, and stone bring inherent warmth to any space. 
                When combined with clean lines and minimal ornamentation, they create that perfect 
                balance of contemporary and inviting.
              </p>

              <div className="my-12 overflow-hidden rounded-2xl">
                <div className="aspect-[3/2] bg-gradient-to-br from-[#d8cec0] via-[#e8e0d4] to-[#ccc0b0]" />
              </div>

              <h2 className="mt-12 text-2xl font-medium tracking-tight text-[var(--foreground)]">
                The Role of Texture
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                In a neutral palette, texture becomes your primary tool for creating visual interest. 
                Linen curtains, wool throws, and leather accents each contribute their own tactile 
                quality that enriches the overall experience of a room.
              </p>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                Consider layering different textures at varying scales. A large area rug with a subtle 
                pattern, combined with smooth ceramic accessories and rough-hewn wooden pieces, creates 
                a dialogue between elements that keeps the eye engaged.
              </p>

              <h2 className="mt-12 text-2xl font-medium tracking-tight text-[var(--foreground)]">
                Lighting as a Design Element
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                Natural light should be maximized wherever possible. Sheer window treatments allow 
                daylight to filter through while maintaining privacy. As evening approaches, carefully 
                planned artificial lighting takes over to maintain the warm ambiance.
              </p>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                Layer your lighting with a combination of ambient, task, and accent sources. This 
                approach gives you flexibility to adjust the mood throughout the day and for different 
                activities.
              </p>

              <div className="my-12 overflow-hidden rounded-2xl">
                <div className="aspect-[3/2] bg-gradient-to-br from-[#f0ebe3] via-[#e4dcd0] to-[#d0c4b4]" />
              </div>

              <h2 className="mt-12 text-2xl font-medium tracking-tight text-[var(--foreground)]">
                Bringing It All Together
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                The final step is editing. Remove anything that doesn&apos;t serve a purpose or contribute 
                to the overall aesthetic. A warm modern space should feel curated, not cluttered. 
                Each piece should earn its place in the room.
              </p>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                Remember that creating a beautiful home is a process, not an event. Allow your space 
                to evolve over time as you discover pieces that speak to you and understand better 
                how you use each room.
              </p>
            </div>
          </FadeUp>

          {/* Share Section */}
          <FadeUp delay={0.6}>
            <div className="mt-16 flex items-center justify-between border-t border-[var(--border)] pt-8">
              <p className="text-sm text-[var(--muted)]">Share this article</p>
              <div className="flex gap-4">
                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          </FadeUp>
        </div>
      </article>

      {/* Related Articles */}
      <section className="border-t border-[var(--border)] bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeUp>
            <h2 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              Continue Reading
            </h2>
          </FadeUp>
          <StaggerContainer className="mt-8 grid gap-8 md:grid-cols-2 lg:gap-12">
            {relatedPosts.map((relatedPost, index) => (
              <StaggerItem key={relatedPost.id}>
                <article className="group">
                  <Link href={`/blogs/${relatedPost.id}`} className="block">
                    <div className="overflow-hidden rounded-2xl">
                      <div className="relative aspect-[16/10]">
                        <Image
                          src={relatedPost.image || fallbackImages[(index + 1) % fallbackImages.length]}
                          alt={relatedPost.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                          {relatedPost.category}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span className="text-xs text-[var(--muted)]">{relatedPost.date}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-medium tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
                        {relatedPost.title}
                      </h3>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
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
                    </div>
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Footer */}
      <FadeIn>
        <footer className="border-t border-[var(--border)] bg-[var(--background)] py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-[var(--muted)]">
                &copy; {new Date().getFullYear()} Dreambuild Design Studio. All rights reserved.
              </p>
              <Link
                href="/"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </footer>
      </FadeIn>
    </main>
  );
}
