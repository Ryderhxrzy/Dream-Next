"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { label: "Home", href: "/", sectionId: null },
  { label: "About", href: "/about", sectionId: null },
  { label: "Services", href: "/#services", sectionId: "services" },
  { label: "Projects", href: "/projects", sectionId: null },
  { label: "Blogs", href: "/blogs", sectionId: null },
  { label: "Process", href: "/#process", sectionId: "process" },
  { label: "Contact", href: "/#contact", sectionId: "contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pathname = usePathname();

  // Track scroll position for homepage sections
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }

    const sectionIds = navigation
      .map((item) => item.sectionId)
      .filter(Boolean) as string[];

    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-20% 0px -55% 0px" }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [pathname]);

  const isActive = (item: (typeof navigation)[number]) => {
    if (item.sectionId) {
      return pathname === "/" && activeSection === item.sectionId;
    }
    if (item.href === "/") {
      return pathname === "/";
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/Images/header.jpg"
              alt="Dreambuild Design Studio"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            {navigation.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center gap-1 py-1"
                >
                  <span
                    className={`text-sm transition-colors duration-200 ${
                      active
                        ? "text-[var(--foreground)] font-medium"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-[var(--foreground)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/#contact"
              className="hidden rounded-full bg-[var(--dark)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--dark-muted)] sm:inline-flex"
            >
              Book Consult
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] md:hidden"
              aria-label="Toggle menu"
            >
              <div className="flex flex-col gap-1">
                <motion.span
                  animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                  className="h-0.5 w-4 bg-[var(--foreground)]"
                />
                <motion.span
                  animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                  className="h-0.5 w-4 bg-[var(--foreground)]"
                />
                <motion.span
                  animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                  className="h-0.5 w-4 bg-[var(--foreground)]"
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden border-t border-[var(--border)] bg-[var(--background)] px-6 md:hidden"
          >
            <nav className="flex flex-col gap-1 py-4">
              {navigation.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--foreground)] font-medium"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    {item.label}
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--foreground)]" />
                    )}
                  </Link>
                );
              })}
              <Link
                href="/#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 rounded-full bg-[var(--dark)] px-5 py-2.5 text-center text-sm font-medium text-white"
              >
                Book Consult
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
