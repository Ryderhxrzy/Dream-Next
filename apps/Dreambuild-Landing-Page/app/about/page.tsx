"use client";

import Link from "next/link";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/landing/footer";
import { FadeUp, FadeIn, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem, motion } from "@/components/ui/motion";

const stats = [
  { value: "150+", label: "Concepts Designed" },
  { value: "48", label: "Spaces Styled" },
  { value: "10", label: "Palette Directions" },
  { value: "5+", label: "Years of Studio Work" },
];

const principles = [
  {
    number: "01",
    title: "Calm over clutter",
    body: "Every decision is filtered through one question — does this make the space feel more settled? We remove what doesn't serve, and keep what belongs.",
  },
  {
    number: "02",
    title: "Material honesty",
    body: "We work with textures and finishes that age well and feel genuine. No filler, no shortcuts — just materials that carry the space forward.",
  },
  {
    number: "03",
    title: "Warmth without softness",
    body: "Our interiors are livable, not precious. We balance refinement with the kind of warmth that makes a home feel used, loved, and real.",
  },
];

const process = [
  { step: "Discovery", desc: "We listen before we sketch. Understanding how you live shapes every direction we take." },
  { step: "Direction", desc: "A single, cohesive design language — no scattered moodboards, no confusion." },
  { step: "Refinement", desc: "Every material, finish, and proportion is reviewed until the space feels resolved." },
  { step: "Delivery", desc: "Presentation-ready concepts that make the path forward clear and confident." },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-28">
        {/* Large decorative text */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <span className="text-[clamp(6rem,20vw,18rem)] font-bold leading-none tracking-tighter text-[var(--border)] opacity-40">
            STUDIO
          </span>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeUp>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              Who We Are
            </p>
          </FadeUp>

          <FadeUp delay={0.15}>
            <h1 className="mt-6 max-w-4xl text-5xl font-medium leading-[1.1] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              A studio built on the belief that great interiors feel inevitable.
            </h1>
          </FadeUp>

          <FadeUp delay={0.25}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
              Dreambuild is a residential interior design studio. We shape spaces that are calm, refined, and deeply livable — homes that reflect the people inside them.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="border-y border-[var(--border)] bg-white">
        <StaggerContainer className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-[var(--border)] px-6 sm:grid-cols-4 sm:divide-y-0 lg:px-8" staggerDelay={0.08}>
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <div className="flex flex-col gap-1 px-6 py-10 first:pl-0 last:pr-0 sm:px-8">
                <span className="text-4xl font-medium tracking-tight text-[var(--foreground)] lg:text-5xl">
                  {s.value}
                </span>
                <span className="text-sm text-[var(--muted)]">{s.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ── Our Story ── */}
      <section className="py-24 lg:py-36">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
            <SlideInLeft className="flex flex-col justify-center">
              <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                Our Story
              </p>
              <h2 className="mt-5 text-3xl font-medium leading-snug tracking-tight text-[var(--foreground)] sm:text-4xl">
                We started because most interiors felt designed — not lived in.
              </h2>
              <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--muted)]">
                <p>
                  Dreambuild began with a frustration: beautiful rooms that felt like showrooms rather than homes. Too stiff, too styled, too perfect. We wanted something different — spaces that had intention without pretension.
                </p>
                <p>
                  Over the years we refined a process that starts with listening, not sketching. We learn how clients move through their homes, what they value, and what exhausts them. That becomes the foundation of every design decision.
                </p>
                <p>
                  The result is interiors that don't announce themselves. They just feel right.
                </p>
              </div>
            </SlideInLeft>

            <SlideInRight delay={0.2} className="relative">
              {/* Placeholder — swap with real image */}
              <div className="relative overflow-hidden rounded-3xl aspect-[4/5] bg-gradient-to-br from-[#e8e3db] via-[#d9d0c5] to-[#c9bfb2]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                {/* Floating label */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="absolute bottom-6 left-6 right-6 rounded-xl bg-white/90 backdrop-blur-sm p-5"
                >
                  <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Studio Philosophy
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-[var(--foreground)]">
                    Refined without being cold. Warm without being soft.
                  </p>
                </motion.div>
              </div>
              {/* Small accent card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="absolute -right-4 top-12 rounded-2xl bg-[var(--dark)] px-6 py-5 text-white shadow-xl lg:-right-8"
              >
                <p className="text-3xl font-medium">5+</p>
                <p className="mt-1 text-xs text-neutral-400">Years crafting spaces</p>
              </motion.div>
            </SlideInRight>
          </div>
        </div>
      </section>

      {/* ── Pull Quote ── */}
      <section className="bg-[var(--dark)] py-24 lg:py-32">
        <FadeIn>
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <p className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
              What We Believe
            </p>
            <blockquote className="mt-8 text-3xl font-medium leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl">
              "The best interior doesn't distract. It disappears — and what's left is a space that feels entirely yours."
            </blockquote>
            <p className="mt-8 text-sm text-neutral-400">— Dreambuild Design Studio</p>
          </div>
        </FadeIn>
      </section>

      {/* ── Principles ── */}
      <section className="py-24 lg:py-36">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between gap-8">
            <FadeUp>
              <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                Studio Principles
              </p>
              <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
                Three ideas we never compromise on.
              </h2>
            </FadeUp>
          </div>

          <StaggerContainer className="mt-16 grid gap-px border border-[var(--border)] overflow-hidden rounded-3xl bg-[var(--border)] lg:grid-cols-3" staggerDelay={0.1}>
            {principles.map((p) => (
              <StaggerItem key={p.number}>
                <motion.div
                  whileHover={{ backgroundColor: "var(--background)" }}
                  className="group flex h-full flex-col gap-6 bg-white p-8 transition-colors lg:p-10"
                >
                  <span className="text-5xl font-bold tracking-tighter text-[var(--border)] transition-colors group-hover:text-[var(--accent-soft)]">
                    {p.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-[var(--foreground)]">{p.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{p.body}</p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── How We Work ── */}
      <section className="bg-white py-24 lg:py-36">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-[1fr_2fr] lg:gap-24">
            <FadeUp className="lg:pt-2">
              <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                How We Work
              </p>
              <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
                A process built for clarity.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--muted)]">
                We run a tight, transparent process — no ambiguity, no surprises. Every stage is designed to move you forward with confidence.
              </p>
            </FadeUp>

            <StaggerContainer className="space-y-0 divide-y divide-[var(--border)]" staggerDelay={0.12}>
              {process.map((item, i) => (
                <StaggerItem key={item.step}>
                  <motion.div
                    whileHover={{ x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-6 py-8"
                  >
                    <span className="mt-0.5 text-xs font-medium tracking-widest text-[var(--muted)] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-[var(--foreground)]">{item.step}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.desc}</p>
                    </div>
                    <span className="mt-0.5 text-[var(--border)] transition-colors group-hover:text-[var(--foreground)]">
                      →
                    </span>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 lg:py-32">
        <FadeUp>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-[var(--dark)] px-8 py-16 text-center lg:px-16 lg:py-24">
              {/* Decorative circle */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />

              <p className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                Ready to Start?
              </p>
              <h2 className="relative mt-5 text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl">
                Let's build something you'll never want to leave.
              </h2>
              <p className="relative mt-6 mx-auto max-w-xl text-base leading-relaxed text-neutral-400">
                Book a consult and we'll figure out together what your space needs — no pressure, no pitch. Just a conversation.
              </p>
              <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/#contact"
                  className="rounded-full bg-white px-7 py-3.5 text-sm font-medium text-[var(--dark)] transition-all hover:bg-neutral-100 hover:scale-105"
                >
                  Book a Consult
                </Link>
                <Link
                  href="/projects"
                  className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-white transition-all hover:border-white/50 hover:scale-105"
                >
                  View Our Projects
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      <Footer />
    </main>
  );
}
