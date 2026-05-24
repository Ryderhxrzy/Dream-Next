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

const fallbackImages = [
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80",
  "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=900&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80",
];

const defaultSections = [
  {
    title: "Starting With The Foundation",
    body:
      "Every successful interior begins with a clear foundation: flooring, wall treatment, base furniture, and the main material direction. These choices create the visual rhythm that the rest of the room follows.",
  },
  {
    title: "The Role Of Texture",
    body:
      "In a quiet palette, texture becomes the design language. Linen, wood grain, matte ceramics, leather, woven panels, and stone details help the room feel layered without adding visual noise.",
  },
  {
    title: "Lighting As A Design Element",
    body:
      "A space needs more than one bright ceiling source. Ambient, task, and accent lighting let the room shift from functional daytime use to a softer evening mood.",
  },
  {
    title: "Bringing It All Together",
    body:
      "The final pass is editing. Remove pieces that do not support the room's purpose, repeat the strongest materials, and let negative space make the key details feel intentional.",
  },
];

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;
  const { blogPosts } = await getDreamBuildContent();
  const post = blogPosts.find((p) => p.id === id);

  if (!post) {
    notFound();
  }

  const postIndex = blogPosts.findIndex((p) => p.id === id);
  const relatedPosts = blogPosts.filter((_, index) => index !== postIndex).slice(0, 3);
  const sections = post.sections?.length ? post.sections : defaultSections;
  const takeaways = post.takeaways?.length
    ? post.takeaways
    : ["Clarify the room's purpose first", "Repeat materials for cohesion", "Use lighting to shape mood"];
  const galleryImages = post.galleryImages?.length ? post.galleryImages : fallbackImages.slice(1, 4);
  const faqs = post.faq?.length
    ? post.faq
    : [
        {
          question: "Can this guide be customized from the admin panel?",
          answer:
            "Yes. DreamBuild blog title, excerpt, image, body, design brief, takeaways, article sections, gallery images, and FAQ content can be mapped from CMS fields.",
        },
        {
          question: "What should I prepare before applying the ideas?",
          answer:
            "Start with room measurements, natural light notes, photos of existing pieces, and a short list of what the space needs to support every day.",
        },
      ];

  return (
    <main className="min-h-screen bg-[#f8f5f0]">
      <Header />

      <article className="pt-32 lg:pt-40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeUp>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <span aria-hidden="true">&lt;-</span>
              Back to Blog
            </Link>
          </FadeUp>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)] lg:items-end">
            <div>
              <FadeUp delay={0.1}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
                    {post.category}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{post.date}</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                  <span className="text-xs text-[var(--muted)]">{post.readTime}</span>
                </div>
              </FadeUp>

              <FadeUp delay={0.2}>
                <h1 className="mt-6 text-4xl font-medium tracking-tight text-[var(--foreground)] text-balance sm:text-5xl lg:text-6xl">
                  {post.title}
                </h1>
              </FadeUp>

              <FadeUp delay={0.3}>
                <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
                  {post.excerpt}
                </p>
              </FadeUp>
            </div>

            <ScaleUp delay={0.35}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#e7ded3] shadow-[0_24px_80px_rgba(64,48,36,0.10)]">
                <Image
                  src={post.image || fallbackImages[0]}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-6">
                  <p className="max-w-md text-sm leading-relaxed text-white/88">
                    {post.designBrief || "A practical Dreambuild guide for turning design intent into a calmer, more livable home."}
                  </p>
                </div>
              </div>
            </ScaleUp>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:px-8 lg:py-24">
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-[1.5rem] border border-[#e4d8ca] bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">In This Guide</p>
              <div className="mt-4 space-y-3">
                {sections.map((section, index) => (
                  <a
                    key={section.title}
                    href={`#section-${index + 1}`}
                    className="block text-sm leading-snug text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {String(index + 1).padStart(2, "0")} / {section.title}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <FadeUp>
              <section className="rounded-[1.75rem] border border-[#e4d8ca] bg-white p-6 sm:p-8">
                <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">Design Brief</p>
                <p className="mt-4 text-xl leading-relaxed tracking-tight text-[var(--foreground)]">
                  {post.designBrief ||
                    post.body ||
                    "A refined room starts with clear intent: what should the space support, how should it feel, and which materials should carry that emotion?"}
                </p>
              </section>
            </FadeUp>

            <FadeUp delay={0.1}>
              <section className="mt-6 grid gap-3 sm:grid-cols-3">
                {takeaways.slice(0, 3).map((item, index) => (
                  <div key={item} className="rounded-[1.25rem] border border-[#e4d8ca] bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">0{index + 1}</p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">{item}</p>
                  </div>
                ))}
              </section>
            </FadeUp>

            <div className="mt-12 space-y-14">
              {sections.map((section, index) => (
                <FadeUp key={section.title} delay={0.08}>
                  <section id={`section-${index + 1}`} className="scroll-mt-28">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-[var(--accent)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="h-px flex-1 bg-[#e4d8ca]" />
                    </div>
                    <h2 className="mt-5 text-2xl font-medium tracking-tight text-[var(--foreground)] sm:text-3xl">
                      {section.title}
                    </h2>
                    <p className="mt-5 text-base leading-8 text-[var(--muted)]">
                      {section.body}
                    </p>
                    {index === 1 && (
                      <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {galleryImages.slice(0, 2).map((src, imageIndex) => (
                          <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[#e7ded3]">
                            <Image
                              src={src}
                              alt={`${post.title} inspiration ${imageIndex + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </FadeUp>
              ))}
            </div>

            <FadeUp delay={0.1}>
              <section className="mt-16 rounded-[1.75rem] bg-[#2d2823] p-7 text-white sm:p-9">
                <p className="text-xs font-medium uppercase tracking-widest text-white/55">Dreambuild Note</p>
                <h2 className="mt-4 text-2xl font-medium tracking-tight">Turn the article into a room plan.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  Use this guide as a starting point, then pair it with actual measurements, lighting conditions, and furniture priorities before making final selections.
                </p>
                <Link
                  href="/#contact"
                  className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-[#2d2823] transition-opacity hover:opacity-85"
                >
                  Start a Design Conversation
                </Link>
              </section>
            </FadeUp>

            <FadeUp delay={0.1}>
              <section className="mt-16">
                <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">FAQ</p>
                <div className="mt-5 divide-y divide-[#e4d8ca] rounded-[1.5rem] border border-[#e4d8ca] bg-white">
                  {faqs.map((item) => (
                    <details key={item.question} className="group p-5 open:bg-[#fbf8f3]">
                      <summary className="cursor-pointer list-none text-base font-medium text-[var(--foreground)]">
                        {item.question}
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            </FadeUp>
          </div>

          <aside className="lg:pt-1">
            <div className="sticky top-28 rounded-[1.5rem] border border-[#e4d8ca] bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">Article Tools</p>
              <div className="mt-5 space-y-3">
                <Link href="/projects" className="block rounded-full border border-[#e4d8ca] px-4 py-3 text-sm text-[var(--foreground)] transition-colors hover:bg-[#f8f5f0]">
                  View Projects
                </Link>
                <Link href="/#services" className="block rounded-full border border-[#e4d8ca] px-4 py-3 text-sm text-[var(--foreground)] transition-colors hover:bg-[#f8f5f0]">
                  Explore Services
                </Link>
                <Link href="/#contact" className="block rounded-full bg-[var(--dark)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85">
                  Contact Dreambuild
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </article>

      <section className="border-t border-[#e4d8ca] bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeUp>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">Continue Reading</p>
                <h2 className="mt-3 text-3xl font-medium tracking-tight text-[var(--foreground)]">
                  More design guides
                </h2>
              </div>
              <Link href="/blogs" className="text-sm font-medium text-[var(--foreground)] underline underline-offset-4">
                Browse all
              </Link>
            </div>
          </FadeUp>
          <StaggerContainer className="mt-8 grid gap-6 md:grid-cols-3" staggerDelay={0.1}>
            {relatedPosts.map((relatedPost, index) => (
              <StaggerItem key={relatedPost.id}>
                <article className="group h-full overflow-hidden rounded-[1.5rem] border border-[#e4d8ca] bg-[#f8f5f0]">
                  <Link href={`/blogs/${relatedPost.id}`} className="block h-full">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={relatedPost.image || fallbackImages[(index + 1) % fallbackImages.length]}
                        alt={relatedPost.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
                        {relatedPost.category}
                      </p>
                      <h3 className="mt-3 text-lg font-medium tracking-tight text-[var(--foreground)]">
                        {relatedPost.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <FadeIn>
        <footer className="border-t border-[var(--border)] bg-[var(--background)] py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-[var(--muted)]">
                &copy; {new Date().getFullYear()} Dreambuild Design Studio. All rights reserved.
              </p>
              <Link href="/" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
                Back to Home
              </Link>
            </div>
          </div>
        </footer>
      </FadeIn>
    </main>
  );
}
