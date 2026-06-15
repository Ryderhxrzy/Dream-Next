import LegalPageShell from "@/components/legal/LegalPageShell"

const SECTIONS = [
  {
    number: "01",
    title: "What Are Cookies?",
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
    content: (
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Cookies are small text files stored on your device when a website is
        loaded in your browser. They help us make the website function properly,
        keep it secure, provide a better user experience, and understand how the
        website performs — including what works and where improvements are
        needed.
      </p>
    ),
  },
  {
    number: "02",
    title: "How AF Home Uses Cookies",
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
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          When you use and access the Service, we may place a number of cookie
          files in your web browser. We use cookies for the following purposes:
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              label: "Essential Cookies",
              desc: "Remember information that changes how the Service behaves or looks, such as language preferences.",
            },
            {
              label: "Account Cookies",
              desc: "Manage the signup process and general administration. Usually deleted on logout, but may persist for site preferences.",
            },
            {
              label: "Analytics Cookies",
              desc: "Help us analyze how visitors use the website and monitor performance to deliver a high-quality experience.",
            },
            {
              label: "Advertising Cookies",
              desc: "Deliver advertisements that are relevant to you and your interests.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 dark:border-sky-900/30 dark:bg-sky-950/20"
            >
              <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    number: "03",
    title: "Third-Party Cookies",
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
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    content: (
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        In addition to our own cookies, we may also use various third-party
        cookies to report usage statistics of the Service and deliver
        advertisements on and through the Service. These third-party cookies are
        governed by the respective privacy policies of the third parties
        involved.
      </p>
    ),
  },
  {
    number: "04",
    title: "Your Choices Regarding Cookies",
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
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          If you prefer to avoid cookies on this website, you can disable them
          in your browser settings and delete any cookies already stored. You
          may do this at any time.
        </p>
        <ul className="mt-3 space-y-2">
          {[
            {
              label: "Browser Settings",
              desc: "Most web browsers let you control cookies through their settings. Visit allaboutcookies.org or youronlinechoices.com to learn more.",
            },
            {
              label: "Opt-Out",
              desc: "You can opt out of targeted advertising via the Network Advertising Initiative and Digital Advertising Alliance.",
            },
          ].map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
            >
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              </span>
              <span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.label}:
                </span>{" "}
                {item.desc}
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "05",
    title: "Changes to This Cookie Policy",
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
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    content: (
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        We may update our Cookie Policy from time to time. We will notify you of
        any changes by posting the new Cookie Policy on this page. You are
        advised to review this Cookie Policy periodically. Changes are effective
        when they are posted on this page.
      </p>
    ),
  },
]

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      subtitle="This policy explains how cookies help improve your browsing experience and how you can control them."
    >
      {/* Hero banner */}
      <div className="not-prose mb-8 overflow-hidden rounded-2xl bg-linear-to-br from-cyan-500 to-sky-600 p-7 text-white shadow-lg shadow-cyan-900/20">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest uppercase opacity-70">
              AF Home · Cookies
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Transparency in every click.
            </h2>
            <p className="mt-1 text-sm opacity-80">
              We use cookies to improve your experience. Here's exactly what we
              collect, why, and how you can control it.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold">
            Effective: 2024
          </div>
        </div>
      </div>

      {/* Quick nav pills */}
      <div className="not-prose mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <span
            key={s.number}
            className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-300"
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                {s.icon}
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {s.title}
              </h2>
            </div>
            <div className="px-5 py-5">{s.content}</div>
          </div>
        ))}

        {/* Contact card */}
        <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-linear-to-br from-cyan-50 to-sky-50 shadow-sm dark:border-cyan-900/40 dark:from-cyan-950/30 dark:to-sky-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
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
                  Questions about our Cookie Policy?
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  AF Home Head Office · Meycauayan, Bulacan
                </p>
              </div>
            </div>
            <a
              href="mailto:info@afhome.biz"
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              info@afhome.biz
            </a>
          </div>
          <div className="border-t border-cyan-200/60 px-5 py-3 dark:border-cyan-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can update your cookie preferences at any time using your
              browser settings. Thank you for visiting AF Home!
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  )
}
