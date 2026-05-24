"use client";

import { FadeUp, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from "@/components/ui/motion";

export function WhoWeAreSection() {
  return (
    <section id="about" className="bg-white py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left Column */}
          <SlideInLeft>
            <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              Who We Are
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              A design studio focused on calm, modern, and highly livable interiors
            </h2>
          </SlideInLeft>

          {/* Right Column */}
          <SlideInRight delay={0.2} className="flex flex-col justify-center">
            <p className="text-base leading-relaxed text-[var(--muted)]">
              Dreambuild creates residential interiors that balance softness, structure, 
              and clarity. We work on spaces that need a more refined material story, 
              stronger visual consistency, and a design direction that feels elegant 
              without looking overdone.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
              From planning and styling to presentation-ready concepts, we shape homes 
              that feel intentional, warm, and easy to live in every day.
            </p>
          </SlideInRight>
        </div>

        {/* Cards Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:mt-20">
          {/* Studio Values Card */}
          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-8 h-full">
              <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                Studio Values
              </p>
              <StaggerContainer className="mt-8 space-y-4" staggerDelay={0.1}>
                {[
                  "Thoughtful space planning",
                  "Refined material combinations",
                  "Clean luxury visual language",
                ].map((item, index) => (
                  <StaggerItem key={item}>
                    <div className="flex items-center gap-4 rounded-xl bg-white p-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-medium text-[var(--foreground)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {item}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </FadeUp>

          {/* Why Clients Choose Us Card */}
          <FadeUp delay={0.2}>
            <div className="rounded-2xl bg-[var(--dark)] p-8 text-white h-full">
              <p className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                Why Clients Choose Us
              </p>
              <StaggerContainer className="mt-8 space-y-6" staggerDelay={0.15}>
                {[
                  "We turn scattered inspiration into one cohesive direction.",
                  "We keep the interiors elevated while still practical and warm.",
                  "We present ideas clearly enough for confident next-step decisions.",
                ].map((item, index) => (
                  <StaggerItem key={item}>
                    <div className="flex gap-4">
                      <span className="text-2xl font-medium text-[var(--accent)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-relaxed text-neutral-300">
                        {item}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
