"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useMotionValue, useAnimationFrame } from "framer-motion";
import { FadeUp } from "@/components/ui/motion";
import { galleryItems as defaultGalleryItems } from "@/lib/landing-data";

const defaultGalleryImages = [
  { src: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80", title: "Living Room Styling", aspect: "aspect-[4/3]" as const },
  { src: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&q=80", title: "Bedroom Material Story", aspect: "aspect-[3/4]" as const },
  { src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80", title: "Modern Kitchen Detail", aspect: "aspect-[4/3]" as const },
  { src: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80", title: "Dining Space Layers", aspect: "aspect-[3/4]" as const },
  { src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80", title: "Lounge Accent Detail", aspect: "aspect-[4/3]" as const },
  { src: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", title: "Warm Neutral Interior", aspect: "aspect-[3/4]" as const },
];

type GalleryImage = typeof defaultGalleryImages[number];

function MarqueeRow({
  items,
  direction = "left",
  speed = 70,
}: {
  items: GalleryImage[];
  direction?: "left" | "right";
  speed?: number;
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
          <Link
            key={i}
            href="/projects"
            className="group relative shrink-0 overflow-hidden rounded-2xl"
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
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

export function GallerySection({ galleryItems = defaultGalleryItems }: { galleryItems?: typeof defaultGalleryItems }) {
  const galleryImages = defaultGalleryImages.map((fallback, index) => ({
    ...fallback,
    title: galleryItems[index]?.title ?? fallback.title,
  }));
  const row1 = [...galleryImages, ...galleryImages];
  const row2 = [...galleryImages.slice().reverse(), ...galleryImages.slice().reverse()];

  return (
    <section id="gallery" className="bg-[var(--background)] py-24 lg:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeUp className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              Interior Gallery
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              A curated look at our aesthetic.
            </h2>
          </div>
          <Link
            href="/projects"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--dark)] hover:text-white hover:border-[var(--dark)]"
          >
            See All Projects
            <span>→</span>
          </Link>
        </FadeUp>
      </div>

      <div className="mt-14 space-y-4 lg:mt-16">
        <MarqueeRow items={row1} direction="left" speed={70} />
        <MarqueeRow items={row2} direction="right" speed={55} />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeUp delay={0.1}>
          <div className="mt-10 flex items-center justify-between border-t border-[var(--border)] pt-8">
            <p className="text-sm text-[var(--muted)]">
              Hover to slow down — click to explore
            </p>
            <p className="text-sm text-[var(--muted)]">
              {galleryItems.length} curated spaces
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
