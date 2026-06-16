"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useAnimationFrame } from "framer-motion";
import { FadeUp } from "@/components/ui/motion";
import type { GalleryContent, GalleryHeaderContent } from "@/lib/dreambuild-cms";

const galleryImageMeta = [
  {
    aspect: "aspect-[4/3]" as const,
    year: "2024",
    category: "Residential",
  },
  {
    aspect: "aspect-[3/4]" as const,
    year: "2024",
    category: "Bedroom",
  },
  {
    aspect: "aspect-[4/3]" as const,
    year: "2023",
    category: "Kitchen",
  },
  {
    aspect: "aspect-[3/4]" as const,
    year: "2024",
    category: "Dining",
  },
  {
    aspect: "aspect-[4/3]" as const,
    year: "2023",
    category: "Lounge",
  },
  {
    aspect: "aspect-[3/4]" as const,
    year: "2024",
    category: "Residential",
  },
];

type GalleryImage = {
  src: string;
  title: string;
  aspect: (typeof galleryImageMeta)[number]["aspect"];
  year: string;
  description: string;
  location: string;
  category: string;
};

const defaultHeader: GalleryHeaderContent = {
  eyebrow: "Interior Gallery",
  title: "A curated look at our aesthetic.",
  ctaText: "See All Projects",
  ctaUrl: "/projects",
};

function MarqueeRow({
  items,
  direction = "left",
  speed = 70,
  onSelect,
}: {
  items: GalleryImage[];
  direction?: "left" | "right";
  speed?: number;
  onSelect: (item: GalleryImage) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    const halfWidth = trackRef.current ? trackRef.current.scrollWidth / 2 : 0;
    if (!halfWidth) return;

    // Initialise right direction to start at -halfWidth
    if (direction === "right" && x.get() === 0) {
      x.set(-halfWidth);
      return;
    }

    const currentSpeed = hovered ? speed * 0.15 : speed;
    const step = (delta / 1000) * currentSpeed;
    let next = x.get();

    if (direction === "left") {
      next -= step;
      if (next <= -halfWidth) next += halfWidth;
    } else {
      next += step;
      if (next >= 0) next -= halfWidth;
    }

    x.set(next);
  });

  return (
    <div
      className="flex overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        ref={trackRef}
        className="flex shrink-0 gap-4"
        style={{ x }}
      >
        {items.map((item, i) => (
          <button
            type="button"
            key={i}
            onClick={() => onSelect(item)}
            className="group relative shrink-0 overflow-hidden rounded-2xl text-left"
            style={{ width: item.aspect === "aspect-[3/4]" ? 240 : 320 }}
          >
            <div className={`relative w-full ${item.aspect} overflow-hidden`}>
              <Image
                src={item.src}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/40 flex items-end p-5"
              >
                <p className="text-sm font-medium text-white">{item.title}</p>
              </motion.div>
            </div>
          </button>
        ))}
      </motion.div>
    </div>
  );
}

export function GallerySection({
  galleryItems = [],
  header = defaultHeader,
}: {
  galleryItems?: GalleryContent[];
  header?: GalleryHeaderContent;
}) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showAllImages, setShowAllImages] = useState(false);
  const galleryImages = galleryItems
    .filter((item) => item.image)
    .map((item, index) => {
      const meta = galleryImageMeta[index % galleryImageMeta.length] ?? galleryImageMeta[0];

      return {
        src: item.image as string,
        title: item.title || `Gallery image ${index + 1}`,
        aspect: meta.aspect,
        year: "2024",
        description: item.description || "A closer look at the Dreambuild interior direction.",
        location: item.address || "Metro Manila",
        category: meta.category,
      };
    });

  useEffect(() => {
    if (!showAllImages && !selectedImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showAllImages, selectedImage]);

  if (!galleryImages.length) return null;

  const hasMultipleImages = galleryImages.length > 1;
  const singleImage = galleryImages[0];
  const row1 = hasMultipleImages ? [...galleryImages, ...galleryImages] : [];
  const row2 = hasMultipleImages ? [...galleryImages.slice().reverse(), ...galleryImages.slice().reverse()] : [];

  return (
    <section id="gallery" className="bg-[var(--background)] py-24 lg:py-36 overflow-hidden">
      <style jsx global>{`
        .dreambuild-hidden-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .dreambuild-hidden-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeUp className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              {header.eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              {header.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAllImages(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--dark)] hover:text-white hover:border-[var(--dark)]"
          >
            {header.ctaText}
            <span>→</span>
          </button>
        </FadeUp>
      </div>

      {hasMultipleImages ? (
        <div className="mt-14 space-y-4 lg:mt-16">
          <MarqueeRow items={row1} direction="left" speed={70} onSelect={setSelectedImage} />
          <MarqueeRow items={row2} direction="right" speed={55} onSelect={setSelectedImage} />
        </div>
      ) : (
        <FadeUp className="mx-auto mt-14 max-w-3xl px-6 lg:mt-16">
          <motion.button
            type="button"
            onClick={() => setSelectedImage(singleImage)}
            className="group block w-full overflow-hidden rounded-3xl text-left shadow-sm"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <Image
                src={singleImage.src}
                alt={singleImage.title}
                fill
                sizes="(min-width: 1024px) 48rem, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-base font-semibold text-white">{singleImage.title}</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                  {singleImage.description}
                </p>
              </div>
            </div>
          </motion.button>
        </FadeUp>
      )}

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeUp delay={0.1}>
          <div className="mt-10 flex items-center justify-between border-t border-[var(--border)] pt-8">
            <p className="text-sm text-[var(--muted)]">
              {hasMultipleImages ? "Hover to slow down - click to explore" : "Click to explore"}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {galleryImages.length} curated {galleryImages.length === 1 ? "space" : "spaces"}
            </p>
          </div>
        </FadeUp>
      </div>

      <AnimatePresence>
        {showAllImages && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/80 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Gallery image list"
            onClick={() => setShowAllImages(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="dreambuild-hidden-scrollbar max-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-y-auto rounded-3xl bg-[var(--background)] p-5 shadow-2xl lg:p-8"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.24 }}
                >
                  <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Complete Gallery
                  </p>
                  <h3 className="mt-2 text-3xl font-medium tracking-tight text-[var(--foreground)]">
                    {header.title}
                  </h3>
                </motion.div>
                <button
                  type="button"
                  onClick={() => setShowAllImages(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  aria-label="Close gallery list"
                >
                  x
                </button>
              </div>

              <motion.div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: { staggerChildren: 0.045, delayChildren: 0.12 },
                  },
                }}
              >
                {galleryImages.map((item) => (
                  <motion.button
                    key={`${item.title}-${item.src}`}
                    type="button"
                    onClick={() => setSelectedImage(item)}
                    className="group overflow-hidden rounded-3xl bg-white text-left shadow-sm"
                    variants={{
                      hidden: { opacity: 0, y: 18, scale: 0.98 },
                      show: { opacity: 1, y: 0, scale: 1 },
                    }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.24 }}
                  >
                    <div className={`relative w-full ${item.aspect} overflow-hidden`}>
                      <Image
                        src={item.src}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-[var(--foreground)]">
                          {item.title}
                        </p>
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          {item.year}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                        {item.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {item.location}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={selectedImage.title}
            onClick={() => setSelectedImage(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[minmax(0,1fr)_22rem]"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 22, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <motion.div
                className="relative min-h-[55vh] bg-black lg:min-h-[74vh]"
                initial={{ opacity: 0.7, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05, duration: 0.3 }}
              >
                <Image
                  src={selectedImage.src}
                  alt={selectedImage.title}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </motion.div>
              <motion.aside
                className="dreambuild-hidden-scrollbar flex flex-col gap-5 overflow-y-auto p-6"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.28 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                      Gallery Preview
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-4">
                      <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                        {selectedImage.title}
                      </h3>
                      <span className="pt-1 text-sm font-semibold text-[var(--muted)]">
                        {selectedImage.year}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                    aria-label="Close image preview"
                  >
                    x
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {selectedImage.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {selectedImage.location}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {selectedImage.category}
                  </span>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
                  <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                    Interior Detail
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    Tap through the full gallery to compare material mood, scale, and styling direction across the collection.
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setShowAllImages(true);
                  }}
                  className="mt-auto inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Gallery
                </motion.button>
              </motion.aside>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
