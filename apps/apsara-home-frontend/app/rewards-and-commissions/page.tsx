import LegalPageShell from '@/components/legal/LegalPageShell'

const SECTIONS = [
  {
    number: '01',
    title: 'Transparent Expectations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    body: 'At AF Home, we understand the importance of transparency and clarity when it comes to network marketing rewards and commissions. We want to ensure that all our valued distributors and partners have a comprehensive understanding of how our compensation plan works.',
  },
  {
    number: '02',
    title: 'Earnings Disclaimer',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    body: 'Any statements or examples of earnings mentioned in our marketing materials or presentations are not guarantees of income. The success and income potential of each individual distributor may vary based on their skills, efforts, and market conditions. Building a successful network marketing business requires time, dedication, and hard work.',
  },
  {
    number: '03',
    title: 'No Income Guarantee',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
    body: 'We do not guarantee any level of income or financial success to our distributors. The amount of income you can earn will depend on various factors, including your personal efforts, the size and productivity of your network, and market conditions. Individual results may vary significantly.',
  },
  {
    number: '04',
    title: 'Compliance with Laws and Regulations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    body: 'As a distributor, it is your responsibility to comply with all applicable laws and regulations governing network marketing and direct selling in your country or region — including advertising guidelines, accurate product representation, and avoiding any misleading or deceptive practices.',
  },
  {
    number: '05',
    title: 'Investment Risk',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    body: 'Participating in network marketing involves certain risks, including the risk of financial loss. Carefully evaluate the opportunity and consider your personal financial situation before making any investment. We recommend consulting with a financial advisor to assess the risks and suitability of this opportunity for you.',
  },
  {
    number: '06',
    title: 'Independent Contractor Status',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    body: 'As a distributor, you are an independent contractor and not an employee, partner, or franchisee of AF Home. You have the freedom to operate your business according to your own schedule and methods, but you are also responsible for your own expenses, taxes, and legal compliance.',
  },
  {
    number: '07',
    title: 'Changes to the Compensation Plan',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
      </svg>
    ),
    body: 'We reserve the right to modify or update our compensation plan at any time to ensure its fairness, sustainability, and compliance with legal requirements. Any changes will be communicated to our distributors in a timely manner.',
  },
  {
    number: '08',
    title: 'Support & Clarity',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    body: 'Please take the time to read and understand these disclaimers. If you have any questions or concerns regarding our network marketing rewards and commissions, please reach out to our support team for further clarification. We are here to support you on your journey to success.',
  },
]

const HIGHLIGHTS = [
  { label: 'Performance-Based', desc: 'Commissions tied to real sales results' },
  { label: 'Transparent Plan', desc: 'Clear structure documented in full' },
  { label: 'Timely Payouts', desc: 'Rewards processed on schedule' },
]

export default function RewardsAndCommissionsPage() {
  return (
    <LegalPageShell
      title="Rewards and Commissions"
      subtitle="Learn how rewards are earned, tracked, and distributed. We keep it transparent so you can plan with confidence."
    >
      {/* Hero banner */}
      <div className="not-prose mb-8 overflow-hidden rounded-2xl bg-linear-to-br from-sky-500 to-cyan-600 p-7 text-white shadow-lg shadow-sky-900/20">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">AF Home · Compensation</p>
            <h2 className="mt-1 text-xl font-bold">Earn more, understand more.</h2>
            <p className="mt-1 text-sm opacity-80">
              A full breakdown of how rewards and commissions work at AF Home — so you can grow with confidence.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold">
            Effective: 2024
          </div>
        </div>

        {/* Highlight chips */}
        <div className="mt-5 flex flex-wrap gap-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.label} className="flex items-center gap-2.5 rounded-xl bg-white/15 px-4 py-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
              <div>
                <p className="text-xs font-bold">{h.label}</p>
                <p className="text-[10px] opacity-70">{h.desc}</p>
              </div>
            </div>
          ))}
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
            <div className="px-5 py-5">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>
            </div>
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
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Questions about commissions?</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Our support team is here to help you succeed.</p>
              </div>
            </div>
            <a href="mailto:info@afhome.biz" className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
              Contact Us
            </a>
          </div>
          <div className="border-t border-sky-200/60 px-5 py-3 dark:border-sky-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              By participating in the AF Home compensation plan you confirm that you have read and understood these rewards and commissions guidelines.
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  )
}
