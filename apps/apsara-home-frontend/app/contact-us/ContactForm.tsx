"use client"

import { useState } from "react"

interface FormState {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-600 focus:border-sky-400 dark:focus:border-sky-600 transition"

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-6 py-10 text-center dark:border-sky-800 dark:bg-sky-900/20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-lg font-bold text-sky-700 dark:text-sky-300">
          Message sent!
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          We&apos;ll get back to you within 24 hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false)
            setForm({
              name: "",
              email: "",
              phone: "",
              subject: "",
              message: "",
            })
          }}
          className="mt-5 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Name
          </label>
          <input
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="Your full name"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Phone Number
          </label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="09XX XXX XXXX"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Subject
          </label>
          <input
            name="subject"
            required
            value={form.subject}
            onChange={handleChange}
            placeholder="How can we help?"
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Message
        </label>
        <textarea
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder="Tell us more about your inquiry..."
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold py-2.5 transition-colors"
      >
        Send Message
      </button>
    </form>
  )
}
