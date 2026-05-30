import { buildPageMetadata } from '@/app/seo'
import LegalPageShell from '@/components/legal/LegalPageShell'

export const metadata = buildPageMetadata({
  title: 'Return & Refund',
  description: 'Learn about the AF Home return and refund policy — eligibility, process, and timelines.',
  path: '/returns',
})

const RETURN_STEPS = [
  {
    step: '1',
    title: 'Contact Us',
    desc: 'Email info@afhome.biz or call 02-840 0290 to request a Return Merchandise Authorization (RMA) number. Provide your order number and reason for return.',
  },
  {
    step: '2',
    title: 'Pack the Item',
    desc: 'Securely package the item(s) with all original packaging, accessories, and documentation included.',
  },
  {
    step: '3',
    title: 'Ship It Back',
    desc: 'Ship to the address provided by our team. Return shipping costs are your responsibility unless the item is defective or incorrect.',
  },
]

const NON_RETURNABLE = ['Gift cards', 'Downloadable software products', 'Personal care items (cosmetics, hygiene products)', 'Items marked as final sale']

const SECTIONS = [
  {
    number: '01',
    title: 'Overview',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    content: (
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        At AF Home, we are committed to providing high-quality products and exceptional service. We understand that sometimes a purchase may not meet your expectations. This Return and Refund Policy outlines the terms and conditions under which returns and refunds are accepted.
      </p>
    ),
  },
  {
    number: '02',
    title: 'Return Eligibility',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">To be eligible for a return, the following conditions must be met:</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Timeframe', value: '7 days from purchase', icon: '📅' },
            { label: 'Condition', value: 'Unused, original packaging, tags intact', icon: '📦' },
            { label: 'Proof', value: 'Receipt or proof of purchase required', icon: '🧾' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 dark:border-sky-900/30 dark:bg-sky-950/20">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">{item.label}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.value}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    number: '03',
    title: 'Return Process',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
      </svg>
    ),
    content: (
      <div className="mt-1 space-y-3">
        {RETURN_STEPS.map((s) => (
          <div key={s.step} className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              {s.step}
            </div>
            <div className="pt-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.title}</p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: '04',
    title: 'Refund Process',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    content: (
      <div className="mt-1 space-y-3">
        {[
          { step: '1', title: 'Inspection', desc: 'Upon receiving your returned item, we inspect it to ensure it meets our return criteria.' },
          { step: '2', title: 'Refund Approval', desc: 'If approved, your refund is processed within 7 to 10 business days to the original payment method.' },
          { step: '3', title: 'Notification', desc: 'You will receive an email confirming the status of your refund.' },
        ].map((s) => (
          <div key={s.step} className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
              {s.step}
            </div>
            <div className="pt-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.title}</p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: '05',
    title: 'Exchanges',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
    ),
    content: (
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        If you wish to exchange an item for a different size, color, or model, contact our customer service team. Exchanges are subject to availability, and you may need to return the original item before the new one is shipped.
      </p>
    ),
  },
  {
    number: '06',
    title: 'Non-Returnable Items',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">The following items cannot be returned:</p>
        <ul className="mt-3 space-y-2">
          {NON_RETURNABLE.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: '07',
    title: 'Damaged or Defective Items',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    content: (
      <>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          If you receive a damaged or defective item, contact us within <span className="font-semibold text-slate-800 dark:text-slate-100">7 days</span> of receipt. We will provide instructions for returning the item and cover the return shipping costs for defective items.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="mailto:info@afhome.biz" className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            info@afhome.biz
          </a>
          <a href="tel:028400290" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            02-840 0290
          </a>
        </div>
      </>
    ),
  },
]

export default function ReturnsPage() {
  return (
    <LegalPageShell
      title="Return & Refund"
      subtitle="We want you to feel confident about your purchase. This policy explains how returns and refunds work."
    >
      {/* Hero banner */}
      <div className="not-prose mb-8 overflow-hidden rounded-2xl bg-linear-to-br from-sky-500 to-cyan-600 p-7 text-white shadow-lg shadow-sky-900/20">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">AF Home · Policy</p>
            <h2 className="mt-1 text-xl font-bold">Shop with confidence.</h2>
            <p className="mt-1 text-sm opacity-80">
              Our return and refund policy is straightforward — 7-day returns, fast refunds, and a dedicated support team.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
              <p className="text-sm font-bold">7 Days</p>
              <p className="text-[10px] opacity-70">Return Window</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
              <p className="text-sm font-bold">7 – 10 Days</p>
              <p className="text-[10px] opacity-70">Refund Processing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick nav pills */}
      <div className="not-prose mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <span key={s.number} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
            {s.number} · {s.title}
          </span>
        ))}
      </div>

      {/* Sections */}
      <div className="not-prose space-y-4">
        {SECTIONS.map((s) => (
          <div key={s.number} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-2xl font-black tracking-tighter text-slate-200 dark:text-slate-700">{s.number}</span>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                {s.icon}
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.title}</h2>
            </div>
            <div className="px-5 py-5">{s.content}</div>
          </div>
        ))}

        {/* Contact card */}
        <div className="overflow-hidden rounded-2xl border border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50 shadow-sm dark:border-sky-900/40 dark:from-sky-950/30 dark:to-cyan-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Need help with a return?</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Our team is ready to assist you anytime.</p>
              </div>
            </div>
            <a href="/contact-us" className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
              Contact Us
            </a>
          </div>
          <div className="border-t border-sky-200/60 px-5 py-3 dark:border-sky-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thank you for choosing AF Home. We appreciate your business and are committed to your satisfaction.
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  )
}
