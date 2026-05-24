"use client";

import Link from "next/link";
import { Header } from "@/components/shared/header";
import { allProjects } from "@/lib/landing-data";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <FadeUp>
              <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                Our Portfolio
              </p>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h1 className="mt-4 text-4xl font-medium tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl text-balance">
                Spaces we have shaped and styled
              </h1>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
                A curated collection of residential interiors that showcase our commitment 
                to refined, livable design. Each project reflects our clients&apos; unique 
                personalities while maintaining a cohesive aesthetic language.
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="pb-20 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:gap-12">
            {allProjects.map((project, index) => (
              <StaggerItem key={project.id}>
                <article className="group">
                  <Link href={`/projects/${project.id}`} className="block">
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
                      <div className="overflow-hidden">
                        <div
                          className={`aspect-[4/3] transition-transform duration-700 group-hover:scale-105 ${
                            index % 4 === 0
                              ? "bg-gradient-to-br from-[#e8e0d4] via-[#d4c8b8] to-[#c0b0a0]"
                              : index % 4 === 1
                                ? "bg-gradient-to-br from-[#d8cec0] via-[#e8e0d4] to-[#ccc0b0]"
                                : index % 4 === 2
                                  ? "bg-gradient-to-br from-[#f0ebe3] via-[#e4dcd0] to-[#d0c4b4]"
                                  : "bg-gradient-to-br from-[#e0d8cc] via-[#d0c4b4] to-[#c4b8a8]"
                          }`}
                        />
                      </div>
                      <div className="p-6 lg:p-8">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                            {project.tag}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                          <span className="text-xs text-[var(--muted)]">
                            {project.location}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                          <span className="text-xs text-[var(--muted)]">
                            {project.year}
                          </span>
                        </div>
                        <h2 className="mt-4 text-xl font-medium tracking-tight text-[var(--foreground)] lg:text-2xl">
                          {project.title}
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                          {project.description}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          {project.scope.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs text-[var(--muted)]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                          View Project
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
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-[var(--border)] bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <FadeUp>
            <h2 className="text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Ready to transform your space?
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
              Let&apos;s discuss your project and explore how we can bring your vision to life 
              with thoughtful, refined design.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/#contact"
                className="inline-flex items-center justify-center rounded-full bg-[var(--dark)] px-8 py-4 text-sm font-medium text-white transition-all hover:bg-[var(--dark-muted)]"
              >
                Start a Conversation
              </Link>
              <Link
                href="/#services"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-8 py-4 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--foreground)]"
              >
                Explore Services
              </Link>
            </div>
          </FadeUp>
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
