import LegalPageShell from "@/components/legal/LegalPageShell"

const sections = [
  {
    number: "01",
    title: "Personal Information We Collect",
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
    content: (
      <>
        <p className="text-slate-600 dark:text-slate-300">
          We may collect the following types of personal information:
        </p>
        <ul className="mt-3 space-y-2">
          {[
            "Name, contact information (address, email address, phone number)",
            "Date of birth, gender, and other demographic information",
            "Payment and financial information",
            "Social media profiles and online presence information",
            "Information related to product purchases and order history",
            "Information you provide during the enrollment or registration process",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
            >
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "02",
    title: "How We Use Personal Information",
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
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    content: (
      <>
        <p className="text-slate-600 dark:text-slate-300">
          We use personal information for the following purposes:
        </p>
        <ul className="mt-3 space-y-2">
          {[
            "To process product orders, enrollments, and registrations",
            "To communicate regarding product updates, promotions, and business-related matters",
            "To provide customer support and assistance",
            "To fulfill contractual obligations and administer the compensation plan",
            "To conduct market research and improve our products and services",
            "For legal and regulatory compliance purposes",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
            >
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "03",
    title: "Sharing Personal Information",
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
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
    content: (
      <ul className="mt-1 space-y-3">
        {[
          "With service providers, contractors, and vendors who assist us in delivering products and services. These third parties are bound by confidentiality obligations.",
          "With our affiliates, subsidiaries, or parent company for business and administrative purposes.",
          "With regulatory authorities, law enforcement, or governmental bodies to comply with legal obligations or enforce our rights.",
          "In the event of a merger, acquisition, or sale of our business, personal information may be transferred to the acquiring entity.",
        ].map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
          >
            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    number: "04",
    title: "Data Security and Retention",
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
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    content: (
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        We implement reasonable security measures to protect personal
        information from unauthorized access, use, or disclosure. Please be
        aware that no data transmission over the Internet or electronic storage
        system is completely secure. We retain personal information as long as
        necessary to fulfill the purposes outlined in this privacy policy, or as
        required by applicable laws and regulations.
      </p>
    ),
  },
  {
    number: "05",
    title: "Your Privacy Rights",
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
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        You have the right to access, correct, and update your personal
        information held by us. You may also request the deletion or restriction
        of your personal information, subject to legal obligations and our
        legitimate business interests. To exercise your privacy rights or for
        any privacy-related inquiries, please contact us using the contact
        information provided below.
      </p>
    ),
  },
  {
    number: "06",
    title: "Changes to the Privacy Policy",
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
        We reserve the right to update and modify this privacy policy at any
        time. Any changes will be posted on our website, and we encourage you to
        review this policy regularly to stay informed about how we protect your
        data.
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="We care about how your data is handled. This policy explains what we collect, why we collect it, and how you can manage your information."
    >
      {/* Hero banner */}
      <div className="not-prose mb-8 overflow-hidden rounded-2xl bg-linear-to-br from-cyan-600 to-teal-600 p-7 text-white shadow-lg shadow-cyan-900/20">
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest uppercase opacity-70">
              AF Home · Data Privacy
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Your privacy is our priority.
            </h2>
            <p className="mt-1 text-sm opacity-80">
              AF Home values the privacy and security of every customer and
              distributor. Read below to understand how we handle your data.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold">
            Last updated: 2024
          </div>
        </div>
      </div>

      {/* Quick nav pills */}
      <div className="not-prose mb-8 flex flex-wrap gap-2">
        {sections.map((s) => (
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
        {sections.map((s) => (
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
        <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-linear-to-br from-cyan-50 to-teal-50 shadow-sm dark:border-cyan-900/40 dark:from-cyan-950/30 dark:to-teal-950/30">
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
                  Questions about your privacy?
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Reach our data privacy team anytime.
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
              This policy is for reference purposes. Consult a qualified legal
              professional to ensure compliance with applicable privacy laws and
              regulations.
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  )
}
