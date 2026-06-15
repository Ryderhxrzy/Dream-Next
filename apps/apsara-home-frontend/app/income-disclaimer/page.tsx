import LegalPageShell from "@/components/legal/LegalPageShell"

const SECTIONS = [
  {
    number: "01",
    title: "Overview",
    color: "amber",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    body: "We provide the following income disclaimer to ensure transparency and set realistic expectations for individuals considering joining our multi-level marketing opportunity.",
  },
  {
    number: "02",
    title: "Earning Potential Varies",
    color: "amber",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    body: "Earning potential in this business is highly individual and can vary greatly based on factors including, but not limited to, effort, dedication, skills, market conditions, and the amount of time invested.",
  },
  {
    number: "03",
    title: "No Typical or Guaranteed Results",
    color: "rose",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    body: "While some individuals may achieve significant financial success in our income opportunity, it is important to note that these results are not typical or guaranteed. Most participants in MLM businesses do not earn substantial incomes and may even experience financial losses.",
  },
  {
    number: "04",
    title: "Success Requires Work",
    color: "amber",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    body: "It is essential to understand that success in this business requires hard work, persistence, and building a strong network of customers and recruits. It is unrealistic to expect immediate or effortless financial gains.",
  },
  {
    number: "05",
    title: "Evaluate Risks and Rewards",
    color: "amber",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    body: "We strongly advise individuals to carefully evaluate the risks, expenses, and potential rewards associated with MLM businesses before making any financial commitments. Seek advice from reputable financial professionals to assess whether this opportunity aligns with your personal goals and circumstances.",
  },
  {
    number: "06",
    title: "No Unofficial Income Claims",
    color: "rose",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    body: "We do not endorse any income claims made by our distributors or representatives that deviate from our official sales and compensation materials. Such claims are not representative of what the majority of participants can expect to achieve.",
  },
  {
    number: "07",
    title: "Your Responsibility",
    color: "amber",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    body: "By joining AF Home you acknowledge that your results may vary, and you assume full responsibility for your financial success or lack thereof.",
  },
]

export default function IncomeDisclaimerPage() {
  return (
    <LegalPageShell
      title="Income Disclaimer"
      subtitle="This disclaimer explains how income results may vary and outlines expectations for affiliates and partners."
    >
      {/* Hero banner */}
      <div className="not-prose mb-8 overflow-hidden rounded-2xl bg-linear-to-br from-sky-400 to-cyan-500 p-7 text-white shadow-lg shadow-sky-900/20">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest uppercase opacity-70">
              AF Home · Disclosure
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Honest expectations, always.
            </h2>
            <p className="mt-1 text-sm opacity-80">
              Income results vary by individual. Please read this disclosure in
              full before making any financial commitment.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold">
            Effective: 2024
          </div>
        </div>
      </div>

      {/* Warning callout */}
      <div className="not-prose mb-8 flex items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
            Important Notice
          </p>
          <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">
            The income figures and examples referenced are not intended to
            represent or guarantee that anyone will achieve the same or similar
            results. Individual results will vary significantly.
          </p>
        </div>
      </div>

      {/* Quick nav pills */}
      <div className="not-prose mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <span
            key={s.number}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
          >
            {s.number} · {s.title}
          </span>
        ))}
      </div>

      {/* Sections */}
      <div className="not-prose space-y-4">
        {SECTIONS.map((s) => (
          <div
            key={s.number}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-2xl font-black tracking-tighter text-slate-200 dark:text-slate-700">
                {s.number}
              </span>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  s.color === "rose"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                {s.icon}
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {s.title}
              </h2>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {s.body}
              </p>
            </div>
          </div>
        ))}

        {/* Contact card */}
        <div className="overflow-hidden rounded-2xl border border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50 shadow-sm dark:border-sky-900/40 dark:from-sky-950/30 dark:to-cyan-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Need clarification?
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Our team is happy to answer your questions.
                </p>
              </div>
            </div>
            <a
              href="mailto:info@afhome.biz"
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              Contact Us
            </a>
          </div>
          <div className="border-t border-sky-200/60 px-5 py-3 dark:border-sky-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              By participating in the AF Home opportunity, you confirm that you
              have read and understood this income disclaimer in its entirety.
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  )
}
