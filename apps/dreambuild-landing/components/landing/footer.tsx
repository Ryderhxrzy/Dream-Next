"use client";

import Image from "next/image";
import Link from "next/link";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <StaggerContainer className="grid gap-10 lg:grid-cols-4 lg:gap-8" staggerDelay={0.1}>
          {/* Brand Column */}
          <StaggerItem className="lg:col-span-2">
            <Image
              src="/Images/DreambuildBanner.jpg"
              alt="Dreambuild Design Studio"
              width={180}
              height={60}
              className="h-8 w-auto object-contain"
            />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
              Interior design studio crafting modern residential spaces with 
              refined finishes and a distinctive design identity.
            </p>
          </StaggerItem>

          {/* Navigation Column */}
          <StaggerItem>
            <p className="text-xs font-medium tracking-widest text-[var(--foreground)] uppercase">
              Navigation
            </p>
            <nav className="mt-4 flex flex-col gap-3">
              <Link
                href="#about"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Who We Are
              </Link>
              <Link
                href="#services"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Services
              </Link>
              <Link
                href="/projects"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Projects
              </Link>
              <Link
                href="/blogs"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Blogs
              </Link>
            </nav>
          </StaggerItem>

          {/* Contact Column */}
          <StaggerItem>
            <p className="text-xs font-medium tracking-widest text-[var(--foreground)] uppercase">
              Contact
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm text-[var(--muted)]">
                hello@dreambuild.studio
              </p>
              <Link
                href="#contact"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Book a Consultation
              </Link>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Bottom Bar */}
        <FadeUp delay={0.3} className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-8 lg:flex-row">
          <p className="text-sm text-[var(--muted)]">
            {currentYear} Dreambuild Design Studio. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Terms of Service
            </Link>
          </div>
        </FadeUp>
      </div>
    </footer>
  );
}
