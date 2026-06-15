"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

import type { HeroContent } from "@/lib/dreambuild-cms"
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion"

const defaultCarouselSlides = [
  {
    src: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80",
    alt: "Modern living room with warm neutrals",
    label: "Living Room",
  },
  {
    src: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
    alt: "Minimalist bedroom interior",
    label: "Bedroom",
  },
  {
    src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    alt: "Clean kitchen design",
    label: "Kitchen",
  },
  {
    src: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    alt: "Elegant dining area",
    label: "Dining",
  },
]

export function HeroSection({ content }: { content: HeroContent }) {
  const carouselSlides = content.carouselSlides.length
    ? content.carouselSlides
    : defaultCarouselSlides
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
    }, 4000)
  }, [carouselSlides.length])

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [startTimer])

  const goTo = (index: number) => {
    setCurrentSlide(index)
    startTimer()
  }

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    setIsDragging(false)
    if (info.offset.x < -50) {
      goTo((currentSlide + 1) % carouselSlides.length)
    } else if (info.offset.x > 50) {
      goTo((currentSlide - 1 + carouselSlides.length) % carouselSlides.length)
    }
  }

  return (
    <section className="relative min-h-screen">
      {/* Hero Content */}
      <div className="mx-auto max-w-7xl px-6 pt-32 pb-20 lg:px-8 lg:pt-40 lg:pb-32">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-20">
          {/* Left Column */}
          <div className="max-w-2xl">
            <FadeUp delay={0.2}>
              <p className="inline-flex items-center rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                {content.eyebrow}
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <h1 className="mt-8 text-4xl leading-tight font-medium tracking-tight text-balance text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                {content.title}
              </h1>
            </FadeUp>

            <FadeUp delay={0.4}>
              <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
                {content.body}
              </p>
            </FadeUp>

            <FadeUp delay={0.5}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href={content.primaryButtonUrl}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--dark)] px-6 py-3.5 text-sm font-medium text-white transition-all hover:scale-105 hover:bg-[var(--dark-muted)]"
                >
                  {content.primaryButtonText}
                </Link>
                <Link
                  href={content.secondaryButtonUrl}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3.5 text-sm font-medium text-[var(--foreground)] transition-all hover:scale-105 hover:border-[var(--foreground)]"
                >
                  {content.secondaryButtonText}
                </Link>
              </div>
            </FadeUp>

            {/* Stats */}
            <StaggerContainer
              className="mt-16 grid grid-cols-3 gap-8"
              staggerDelay={0.15}
            >
              {content.stats.map((item) => (
                <StaggerItem key={item.label}>
                  <p className="text-3xl font-medium tracking-tight text-[var(--foreground)] lg:text-4xl">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {item.label}
                  </p>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Right Column - Carousel */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.4,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="relative"
          >
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              className={`relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-2xl select-none ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                  className="pointer-events-none absolute inset-0"
                >
                  <Image
                    src={carouselSlides[currentSlide].src}
                    alt={carouselSlides[currentSlide].alt}
                    fill
                    className="object-cover"
                    priority={currentSlide === 0}
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </motion.div>
              </AnimatePresence>

              {/* Slide label + dots */}
              <div className="pointer-events-none absolute right-6 bottom-6 left-6 flex items-end justify-between">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`label-${currentSlide}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="text-xs font-medium tracking-widest text-white/80 uppercase"
                  >
                    {carouselSlides[currentSlide].label}
                  </motion.p>
                </AnimatePresence>

                <div className="pointer-events-auto flex items-center gap-2">
                  {carouselSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goTo(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    >
                      <motion.span
                        animate={{
                          width: index === currentSlide ? 20 : 6,
                          opacity: index === currentSlide ? 1 : 0.5,
                        }}
                        transition={{ duration: 0.3 }}
                        className="block h-1.5 rounded-full bg-white"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="absolute top-10 -left-6 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xl"
            >
              <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                Signature Style
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                {content.signatureLabel}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
