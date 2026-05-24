"use client";

import { useState } from "react";
import { testimonials as defaultTestimonials } from "@/lib/landing-data";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp } from "@/components/ui/motion";

export function TestimonialsSection({ testimonials = defaultTestimonials }: { testimonials?: typeof defaultTestimonials }) {
  const [current, setCurrent] = useState(0);

  if (testimonials.length === 0) return null;

  const prev = () => setCurrent((i) => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((i) => (i + 1) % testimonials.length);

  const active = testimonials[current];

  return (
    <section className="bg-white py-24 lg:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* Header */}
        <FadeUp className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              Client Testimonials
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              What clients say.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-[var(--muted)] lg:text-right">
            Real feedback from homeowners who trusted us with their spaces.
          </p>
        </FadeUp>

        {/* Main testimonial block */}
        <div className="mt-16 grid gap-12 lg:mt-20 lg:grid-cols-[1fr_1.8fr] lg:gap-20">

          {/* Left — Author + Nav */}
          <div className="flex flex-col justify-between gap-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-[#d4c8b8] to-[#b8a898]">
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-medium text-white">
                      {active.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{active.name}</p>
                    <p className="text-sm text-[var(--muted)]">{active.role}</p>
                  </div>
                </div>

                {/* Divider + rating */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--border)]" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className="h-4 w-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>

                {/* Counter */}
                <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                  {String(current + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={prev}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] transition-all hover:bg-[var(--dark)] hover:text-white hover:border-[var(--dark)]"
                aria-label="Previous testimonial"
              >
                ←
              </button>
              <button
                onClick={next}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] transition-all hover:bg-[var(--dark)] hover:text-white hover:border-[var(--dark)]"
                aria-label="Next testimonial"
              >
                →
              </button>
              {/* Dots */}
              <div className="ml-2 flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                  >
                    <motion.span
                      animate={{
                        width: i === current ? 20 : 6,
                        backgroundColor: i === current ? "var(--foreground)" : "var(--border)",
                      }}
                      transition={{ duration: 0.3 }}
                      className="block h-1.5 rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Quote */}
          <div className="relative flex flex-col justify-center">
            {/* Large decorative quote mark */}
            <div className="pointer-events-none absolute -top-8 -left-4 select-none text-[10rem] font-bold leading-none text-[var(--border)] opacity-50 lg:-left-8">
              &quot;
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <blockquote className="relative text-2xl font-medium leading-relaxed tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-4xl">
                  {active.quote}
                </blockquote>

                {/* Tag */}
                <div className="mt-10 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2">
                  <span className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Verified Client
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
