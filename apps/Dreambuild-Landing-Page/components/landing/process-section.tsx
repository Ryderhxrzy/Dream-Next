"use client";

import { processSteps as defaultProcessSteps } from "@/lib/landing-data";
import type { ProcessStepContent } from "@/lib/dreambuild-cms";
import { FadeUp, SlideInLeft, StaggerContainer, StaggerItem } from "@/components/ui/motion";
import { motion } from "framer-motion";

export function ProcessSection({ processSteps = defaultProcessSteps }: { processSteps?: ProcessStepContent[] }) {
  return (
    <section id="process" className="bg-[var(--dark)] py-24 lg:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* Header */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-20">
          <SlideInLeft>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
              <span className="h-px w-8 bg-[var(--accent)]" />
              Our Process
            </p>
            <h2 className="mt-5 text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Clear design direction before the build stage.
            </h2>
          </SlideInLeft>

          <FadeUp delay={0.15} className="flex items-end">
            <p className="text-base leading-relaxed text-neutral-400">
              We follow a tight, structured process — no guesswork, no miscommunication. Every stage is designed to give you confidence before a single peso is spent on construction.
            </p>
          </FadeUp>
        </div>

        {/* Timeline Steps */}
        <div className="relative mt-20 lg:mt-28">

          {/* Connecting line — desktop only */}
          <div className="absolute top-[3.25rem] left-0 right-0 hidden lg:block">
            <div className="relative mx-auto flex items-center">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
                style={{ transformOrigin: "left" }}
                className="h-px w-full bg-gradient-to-r from-[var(--accent)] via-white/20 to-transparent"
              />
            </div>
          </div>

          <StaggerContainer
            className="grid gap-12 lg:grid-cols-3 lg:gap-0"
            staggerDelay={0.2}
          >
            {processSteps.map((step, index) => (
              <StaggerItem key={step.title}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="relative flex flex-col lg:pr-12"
                >
                  {/* Step number circle */}
                  <div className="relative z-10 flex items-center gap-5 lg:flex-col lg:items-start lg:gap-0">
                    <div className="flex h-[6.5rem] w-[6.5rem] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm lg:h-[6.5rem] lg:w-[6.5rem]">
                      <span className="text-3xl font-bold tracking-tighter text-white">
                        {step.stepNumber || String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Vertical line for mobile */}
                    {index < processSteps.length - 1 && (
                      <div className="absolute left-[3.25rem] top-[6.5rem] h-full w-px -translate-x-1/2 bg-white/10 lg:hidden" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="mt-8 pl-0">
                    <p className="text-xs font-medium tracking-widest text-[var(--accent)] uppercase">
                      Step {step.stepNumber || String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 text-2xl font-medium tracking-tight text-white lg:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-neutral-400">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Bottom strip */}
        <FadeUp delay={0.2}>
          <div className="mt-20 flex flex-col items-start justify-between gap-6 border-t border-white/10 pt-12 sm:flex-row sm:items-center lg:mt-28">
            <p className="text-sm text-neutral-400">
              Most projects move from discovery to delivery in{" "}
              <span className="font-medium text-white">4–6 weeks.</span>
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white hover:text-[var(--dark)] hover:border-white"
            >
              Start Your Project
              <span>→</span>
            </a>
          </div>
        </FadeUp>

      </div>
    </section>
  );
}
