"use client"

import Image from "next/image"
import Link from "next/link"

import { projects as defaultProjects } from "@/lib/landing-data"
import { FadeUp, motion } from "@/components/ui/motion"

const projectImages = [
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
  "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
]

// Bento layout config per card index
const bentoConfig = [
  "lg:col-span-1 lg:row-span-2", // tall left
  "lg:col-span-1 lg:row-span-1", // top middle
  "lg:col-span-1 lg:row-span-2", // tall right
  "lg:col-span-1 lg:row-span-1", // bottom middle
]

const aspectConfig = [
  "aspect-[3/4] lg:aspect-auto lg:h-full",
  "aspect-[4/3]",
  "aspect-[3/4] lg:aspect-auto lg:h-full",
  "aspect-[4/3]",
]

export function ProjectsSection({
  projects = defaultProjects,
}: {
  projects?: typeof defaultProjects
}) {
  return (
    <section id="projects" className="bg-white py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <FadeUp className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              Featured Projects
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              Spaces we&apos;ve shaped and styled.
            </h2>
          </div>
          <Link
            href="/projects"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--dark)] hover:bg-[var(--dark)] hover:text-white"
          >
            View All Projects
            <span>→</span>
          </Link>
        </FadeUp>

        {/* Bento Grid */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:grid-rows-2 lg:gap-4">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={
                bentoConfig[index] ?? bentoConfig[index % bentoConfig.length]
              }
            >
              <Link
                href="/projects"
                className="group relative block h-full overflow-hidden rounded-2xl"
              >
                {/* Image */}
                <div
                  className={`relative w-full overflow-hidden ${aspectConfig[index] ?? aspectConfig[index % aspectConfig.length]}`}
                >
                  <Image
                    src={
                      projectImages[index] ??
                      projectImages[index % projectImages.length]
                    }
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Default dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Hover overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-black/40"
                  />

                  {/* Number badge — top right */}
                  <div className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-sm">
                    <span className="text-xs font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Content — bottom */}
                  <div className="absolute right-0 bottom-0 left-0 p-5 lg:p-6">
                    {/* Tag slides up on hover */}
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      whileHover={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs font-medium tracking-widest text-white/70 uppercase"
                    >
                      {project.tag}
                    </motion.p>
                    <h3 className="mt-1.5 text-base leading-snug font-medium text-white lg:text-lg">
                      {project.title}
                    </h3>

                    {/* Arrow — appears on hover */}
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/80"
                    >
                      View Project
                      <span>→</span>
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom strip */}
        <FadeUp
          delay={0.2}
          className="mt-10 flex items-center justify-between border-t border-[var(--border)] pt-8"
        >
          <p className="text-sm text-[var(--muted)]">
            Showing{" "}
            <span className="font-medium text-[var(--foreground)]">
              {projects.length}
            </span>{" "}
            of our featured projects
          </p>
          <Link
            href="/projects"
            className="text-sm font-medium text-[var(--foreground)] underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            See full portfolio →
          </Link>
        </FadeUp>
      </div>
    </section>
  )
}
