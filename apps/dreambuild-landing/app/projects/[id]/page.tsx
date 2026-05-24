"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Header } from "@/components/shared/header";
import { allProjects } from "@/lib/landing-data";
import { FadeUp, FadeIn, ScaleUp, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from "@/components/ui/motion";

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const project = allProjects.find((p) => p.id === id);

  if (!project) {
    notFound();
  }

  const projectIndex = allProjects.findIndex((p) => p.id === id);
  const nextProject = allProjects[(projectIndex + 1) % allProjects.length];
  const prevProject = allProjects[(projectIndex - 1 + allProjects.length) % allProjects.length];

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeUp>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Back to Projects
            </Link>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                {project.tag}
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">{project.location}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">{project.year}</span>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <h1 className="mt-4 text-4xl font-medium tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl text-balance">
              {project.title}
            </h1>
          </FadeUp>

          <FadeUp delay={0.3}>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--muted)]">
              {project.description}
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Main Image */}
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <ScaleUp>
            <div className="overflow-hidden rounded-2xl">
              <div className="aspect-[16/9] bg-gradient-to-br from-[#e8e0d4] via-[#d4c8b8] to-[#c0b0a0]" />
            </div>
          </ScaleUp>
        </div>
      </section>

      {/* Project Details */}
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <StaggerContainer className="grid gap-12 lg:grid-cols-3">
            {/* Scope */}
            <StaggerItem>
              <div>
                <h3 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                  Project Scope
                </h3>
                <ul className="mt-4 space-y-2">
                  {project.scope.map((item) => (
                    <li key={item} className="text-base text-[var(--foreground)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>

            {/* Location */}
            <StaggerItem>
              <div>
                <h3 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                  Location
                </h3>
                <p className="mt-4 text-base text-[var(--foreground)]">{project.location}</p>
              </div>
            </StaggerItem>

            {/* Year */}
            <StaggerItem>
              <div>
                <h3 className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                  Year Completed
                </h3>
                <p className="mt-4 text-base text-[var(--foreground)]">{project.year}</p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="pb-20 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <StaggerContainer className="grid gap-6 sm:grid-cols-2">
            <StaggerItem>
              <div className="group overflow-hidden rounded-2xl">
                <div className="aspect-[4/5] bg-gradient-to-br from-[#d8cec0] via-[#e8e0d4] to-[#ccc0b0] transition-transform duration-500 group-hover:scale-105" />
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="group overflow-hidden rounded-2xl">
                <div className="aspect-[4/5] bg-gradient-to-br from-[#f0ebe3] via-[#e4dcd0] to-[#d0c4b4] transition-transform duration-500 group-hover:scale-105" />
              </div>
            </StaggerItem>
            <StaggerItem className="sm:col-span-2">
              <div className="group overflow-hidden rounded-2xl">
                <div className="aspect-[21/9] bg-gradient-to-br from-[#e0d8cc] via-[#d0c4b4] to-[#c4b8a8] transition-transform duration-500 group-hover:scale-105" />
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="group overflow-hidden rounded-2xl">
                <div className="aspect-square bg-gradient-to-br from-[#e8e0d4] via-[#d4c8b8] to-[#c0b0a0] transition-transform duration-500 group-hover:scale-105" />
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="group overflow-hidden rounded-2xl">
                <div className="aspect-square bg-gradient-to-br from-[#d8cec0] via-[#e8e0d4] to-[#ccc0b0] transition-transform duration-500 group-hover:scale-105" />
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Project Navigation */}
      <section className="border-t border-[var(--border)] bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <SlideInLeft>
              <Link
                href={`/projects/${prevProject.id}`}
                className="group rounded-2xl border border-[var(--border)] p-6 transition-all hover:border-[var(--foreground)] hover:shadow-lg lg:p-8"
              >
                <span className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                  Previous Project
                </span>
                <h3 className="mt-3 text-xl font-medium text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] lg:text-2xl">
                  {prevProject.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{prevProject.tag}</p>
              </Link>
            </SlideInLeft>

            <SlideInRight>
              <Link
                href={`/projects/${nextProject.id}`}
                className="group rounded-2xl border border-[var(--border)] p-6 text-right transition-all hover:border-[var(--foreground)] hover:shadow-lg lg:p-8"
              >
                <span className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                  Next Project
                </span>
                <h3 className="mt-3 text-xl font-medium text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] lg:text-2xl">
                  {nextProject.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{nextProject.tag}</p>
              </Link>
            </SlideInRight>
          </div>
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
