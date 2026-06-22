import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getDreamBuildContent } from "@/lib/dreambuild-cms"
import {
  FadeIn,
  FadeUp,
  ScaleUp,
  SlideInLeft,
  SlideInRight,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion"
import { Header } from "@/components/shared/header"

type ProjectPageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const { projects } = await getDreamBuildContent()
  const project = projects.find((item) => item.id === id)

  if (!project) {
    notFound()
  }

  const projectIndex = projects.findIndex((item) => item.id === id)
  const nextProject = projects[(projectIndex + 1) % projects.length]
  const prevProject = projects[(projectIndex - 1 + projects.length) % projects.length]
  const metaItems = [project.location, project.scopeLabel, project.timeline].filter(Boolean)
  const hasProjectDetails = project.scopeItems.length > 0 || project.location || project.timeline || project.story

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />

      <section className="pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeUp>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <span aria-hidden="true">←</span>
              Back to Projects
            </Link>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {project.tag && (
                <span className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                  {project.tag}
                </span>
              )}
              {metaItems.map((item, index) => (
                <span key={item} className="contents">
                  {(project.tag || index > 0) && <span className="h-1 w-1 rounded-full bg-[var(--border)]" />}
                  <span className="text-xs text-[var(--muted)]">{item}</span>
                </span>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <h1 className="mt-4 text-4xl font-medium tracking-tight text-balance text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              {project.title}
            </h1>
          </FadeUp>

          {project.description && (
            <FadeUp delay={0.3}>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--muted)]">
                {project.description}
              </p>
            </FadeUp>
          )}
        </div>
      </section>

      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <ScaleUp>
            <div className="overflow-hidden rounded-2xl">
              <div className="relative aspect-[16/9]">
                {project.image ? (
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-80 flex-col items-center justify-center bg-neutral-100 text-center text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Image pending
                  </div>
                )}
              </div>
            </div>
          </ScaleUp>
        </div>
      </section>

      {hasProjectDetails && (
        <section className="pb-20 lg:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <StaggerContainer className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <StaggerItem>
                <div className="space-y-6">
                  {project.scopeItems.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                        Project Scope
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.scopeItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-sm text-[var(--foreground)]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.location && (
                    <div>
                      <h3 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                        City / Area
                      </h3>
                      <p className="mt-3 text-base text-[var(--foreground)]">
                        {project.location}
                      </p>
                    </div>
                  )}
                  {project.timeline && (
                    <div>
                      <h3 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                        Timeline
                      </h3>
                      <p className="mt-3 text-base text-[var(--foreground)]">
                        {project.timeline}
                      </p>
                    </div>
                  )}
                </div>
              </StaggerItem>

              {project.story && (
                <StaggerItem>
                  <article className="border-l border-[var(--border)] pl-6 lg:pl-10">
                    <h2 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                      Detail-page story
                    </h2>
                    <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-[var(--foreground)]">
                      {project.story}
                    </p>
                  </article>
                </StaggerItem>
              )}
            </StaggerContainer>
          </div>
        </section>
      )}

      {projects.length > 1 && (
        <section className="border-t border-[var(--border)] bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2">
              <SlideInLeft>
                <Link
                  href={`/projects/${prevProject.id}`}
                  className="group block rounded-2xl border border-[var(--border)] p-6 transition-all hover:border-[var(--foreground)] hover:shadow-lg lg:p-8"
                >
                  <span className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Previous Project
                  </span>
                  <h3 className="mt-3 text-xl font-medium text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] lg:text-2xl">
                    {prevProject.title}
                  </h3>
                  {prevProject.tag && (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {prevProject.tag}
                    </p>
                  )}
                </Link>
              </SlideInLeft>

              <SlideInRight>
                <Link
                  href={`/projects/${nextProject.id}`}
                  className="group block rounded-2xl border border-[var(--border)] p-6 text-right transition-all hover:border-[var(--foreground)] hover:shadow-lg lg:p-8"
                >
                  <span className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Next Project
                  </span>
                  <h3 className="mt-3 text-xl font-medium text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] lg:text-2xl">
                    {nextProject.title}
                  </h3>
                  {nextProject.tag && (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {nextProject.tag}
                    </p>
                  )}
                </Link>
              </SlideInRight>
            </div>
          </div>
        </section>
      )}

      <FadeIn>
        <footer className="border-t border-[var(--border)] bg-[var(--background)] py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-[var(--muted)]">
                &copy; {new Date().getFullYear()} Dreambuild Design Studio. All rights reserved.
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
