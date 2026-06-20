"use client"

import { useState } from "react"
import { motion } from "framer-motion"

import { SlideInLeft, SlideInRight } from "@/components/ui/motion"

const projectTypes = [
  "Full Solution - Design to Installation",
  "Interior Design",
  "Sourcing & Supply",
  "Installation & Finishing",
  "Not sure yet",
]

type ContactContent = {
  title: string
  body: string
  email: string
  phone?: string
  address: string
  responseTime: string
  statusBadge: string
}

const defaultContact: ContactContent = {
  title: "Ready to build something remarkable?",
  body: "Tell us about your space and what you're looking for. We'll get back to you within 24 hours to set up a free consultation.",
  email: "hello@dreambuild.studio",
  phone: "+63 997 875 3004",
  address: "Metro Manila, Philippines",
  responseTime: "Within 24 hours",
  statusBadge: "Currently accepting new projects",
}

export function ContactSection({
  contact = defaultContact,
}: {
  contact?: ContactContent
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    projectType: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Wire up to your backend here
    setSubmitted(true)
  }
  const contactDetails = [
    { label: "Email", value: contact.email },
    ...(contact.phone ? [{ label: "Phone / Viber", value: contact.phone }] : []),
    { label: "Location", value: contact.address },
    { label: "Response Time", value: contact.responseTime },
  ]

  return (
    <section id="contact" className="relative overflow-hidden py-24 lg:py-36">
      {/* Decorative background text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none">
        <span className="text-[clamp(5rem,18vw,14rem)] leading-none font-bold tracking-tighter whitespace-nowrap text-[var(--border)] opacity-30">
          LET&apos;S TALK
        </span>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Left — Info */}
          <SlideInLeft className="flex flex-col justify-center">
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
              <span className="h-px w-8 bg-[var(--muted)]" />
              Start Your Project
            </p>
            <h2 className="mt-5 text-4xl leading-tight font-medium tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              {contact.title}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-[var(--muted)]">
              {contact.body}
            </p>

            {/* Contact details */}
            <div className="mt-12 space-y-6">
              {contactDetails.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--foreground)]" />
                  <div>
                    <p className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Availability badge */}
            <div className="mt-12">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-white px-4 py-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <p className="text-xs font-medium text-[var(--foreground)]">
                  {contact.statusBadge}
                </p>
              </div>
            </div>
          </SlideInLeft>

          {/* Right — Form */}
          <SlideInRight delay={0.15}>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center rounded-3xl border border-[var(--border)] bg-white px-10 py-20 text-center shadow-sm"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl">
                  ✓
                </div>
                <h3 className="mt-6 text-2xl font-medium text-[var(--foreground)]">
                  Message sent!
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  Thanks for reaching out. We&apos;ll be in touch within 24
                  hours.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm lg:p-10"
              >
                <div className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="mb-2 block text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] transition-all outline-none placeholder:text-[var(--muted)] focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/10"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-2 block text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] transition-all outline-none placeholder:text-[var(--muted)] focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/10"
                    />
                  </div>

                  {/* Project Type */}
                  <div>
                    <label className="mb-2 block text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                      What do you need?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {projectTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, projectType: type })
                          }
                          className={`min-h-10 rounded-xl border px-4 py-2.5 text-left text-xs font-medium leading-snug transition-all ${
                            formData.projectType === type
                              ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                              : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-2 block text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                      Tell Us About Your Space
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe your space, budget range, timeline, or anything else..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] transition-all outline-none placeholder:text-[var(--muted)] focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/10"
                    />
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-xl bg-[var(--dark)] py-3.5 text-sm font-medium text-white transition-colors hover:bg-[var(--dark-muted)]"
                  >
                    Send Message →
                  </motion.button>

                  <p className="text-center text-xs text-[var(--muted)]">
                    No commitment. We&apos;ll reach out to learn more before
                    anything begins.
                  </p>
                </div>
              </form>
            )}
          </SlideInRight>
        </div>
      </div>
    </section>
  )
}
