"use client";

import Link from "next/link";
import Image from "next/image";
import type { ServiceContent as DreamBuildServiceContent, ServicesCtaContent, ServicesHeaderContent } from "@/lib/dreambuild-cms";
import { FadeUp, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from "@/components/ui/motion";
import { motion } from "framer-motion";

const serviceImages = [
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80",
  "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=900&q=80",
];

const defaultCta: ServicesCtaContent = {
  text: "Not sure which service fits your project?",
  buttonText: "Book a Free Consult",
  buttonUrl: "#contact",
};

const defaultHeader: ServicesHeaderContent = {
  eyebrow: "Interior Services",
  title: "What we do best.",
  description: "Three focused service areas, each designed to move your space forward with clarity and intention.",
};

export function ServicesSection({
  services = [],
  header = defaultHeader,
  cta = defaultCta,
}: {
  services?: DreamBuildServiceContent[];
  header?: ServicesHeaderContent;
  cta?: ServicesCtaContent;
}) {
  return (
    <section id="services" className="overflow-hidden py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* Header */}
        <FadeUp className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              {header.eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              {header.title}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)] lg:text-right">
            {header.description}
          </p>
        </FadeUp>

        {/* Services */}
        <div className="mt-20 lg:mt-28 space-y-32 lg:space-y-40">
          {services.map((service, index) => {
            const isEven = index % 2 === 1;
            return (
              <div key={service.id} className="relative">

                {/* Oversized background number */}
                <div
                  className={`pointer-events-none absolute -top-10 select-none text-[clamp(8rem,20vw,16rem)] font-bold leading-none tracking-tighter text-[var(--border)] opacity-30 ${
                    isEven ? "right-0" : "left-0"
                  }`}
                >
                  {service.id}
                </div>

                <div className={`relative grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16 ${isEven ? "" : ""}`}>

                  {/* Image */}
                  {isEven ? (
                    <>
                      {/* Text first on mobile, image second — but on desktop image is on right */}
                      <SlideInLeft className="flex flex-col justify-center lg:order-1">
                        <ServiceContent service={service} />
                      </SlideInLeft>
                      <SlideInRight delay={0.15} className="lg:order-2">
                        <ServiceImage src={service.image || serviceImages[index] || serviceImages[index % serviceImages.length]} alt={service.title} id={service.id} />
                      </SlideInRight>
                    </>
                  ) : (
                    <>
                      <SlideInLeft className="lg:order-1">
                        <ServiceImage src={service.image || serviceImages[index] || serviceImages[index % serviceImages.length]} alt={service.title} id={service.id} />
                      </SlideInLeft>
                      <SlideInRight delay={0.15} className="flex flex-col justify-center lg:order-2">
                        <ServiceContent service={service} />
                      </SlideInRight>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <FadeUp delay={0.1} className="mt-24 flex flex-col items-center gap-5 border-t border-[var(--border)] pt-16 text-center lg:mt-32">
          <p className="text-lg font-medium text-[var(--foreground)]">
            {cta.text}
          </p>
          <Link
            href={cta.buttonUrl}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--dark)] px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-[var(--dark-muted)] hover:scale-105"
          >
            {cta.buttonText}
            <span>→</span>
          </Link>
        </FadeUp>

      </div>
    </section>
  );
}

function ServiceImage({ src, alt, id }: { src: string; alt: string; id: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="group relative overflow-hidden rounded-3xl aspect-[4/3] shadow-xl"
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

      {/* Number badge */}
      <div className="absolute top-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md">
        <span className="text-sm font-bold tracking-tight text-[var(--foreground)]">{id}</span>
      </div>
    </motion.div>
  );
}

function ServiceContent({ service }: { service: DreamBuildServiceContent }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
        {service.serviceLabel} {service.id}
      </p>
      <h3 className="mt-4 text-2xl font-medium tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-4xl">
        {service.title}
      </h3>
      <p className="mt-5 text-base leading-relaxed text-[var(--muted)]">
        {service.description}
      </p>

      {/* Divider */}
      <div className="my-8 h-px w-12 bg-[var(--border)]" />

      {/* Bullets */}
      <StaggerContainer className="space-y-4" staggerDelay={0.1}>
        {service.bullets.map((bullet, i) => (
          <StaggerItem key={bullet}>
            <div className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-medium text-[var(--foreground)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-[var(--muted)]">{bullet}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
