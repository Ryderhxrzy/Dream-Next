import LegalPageShell from "@/components/legal/LegalPageShell"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Shipping Info",
  description:
    "Learn about AF Home shipping options, delivery times, and coverage areas across the Philippines.",
  path: "/shipping-info",
})

const DELIVERY_ZONES = [
  {
    area: "Metro Manila",
    days: "3 – 5 business days",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  {
    area: "Luzon (outside Metro Manila)",
    days: "5 – 7 business days",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  },
  {
    area: "Visayas & Mindanao",
    days: "7 – 14 business days",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    area: "Remote Areas",
    days: "Varies — team will confirm",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
]

const SECTIONS = [
  {
    number: "01",
    title: "Delivery Coverage",
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
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          AF Home delivers nationwide across the Philippines. Delivery
          timeframes vary by location:
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {DELIVERY_ZONES.map((zone) => (
            <div
              key={zone.area}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {zone.area}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${zone.color}`}
              >
                {zone.days}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Business days are Monday through Saturday, excluding public holidays.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "Shipping Fees",
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
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    content: (
      <>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Shipping fees are calculated at checkout based on the delivery address
          and the total weight or dimensions of your order. We partner with
          trusted couriers to ensure your items arrive safely and on time.
        </p>
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 dark:border-sky-900/30 dark:bg-sky-950/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 shrink-0 text-sky-500"
          >
            <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" />
          </svg>
          <p className="text-xs text-sky-700 dark:text-sky-300">
            Free shipping promotions may be available during special sale
            events. Watch our announcements for updates.
          </p>
        </div>
      </>
    ),
  },
  {
    number: "03",
    title: "Order Processing",
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
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    content: (
      <>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Orders are processed within{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            1 to 2 business days
          </span>{" "}
          after payment confirmation. You will receive a confirmation email with
          your order details once processing begins.
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Orders placed on weekends or public holidays will be processed on the
          next business day.
        </p>
      </>
    ),
  },
  {
    number: "04",
    title: "Tracking Your Order",
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
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    content: (
      <>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Once your order has been shipped, you will receive a tracking number
          via email or SMS. Use this number to monitor your delivery status.
        </p>
        <div className="mt-3">
          <a
            href="/track-order"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Track My Order
          </a>
        </div>
      </>
    ),
  },
  {
    number: "05",
    title: "Large Item Delivery",
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
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    content: (
      <>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          For bulky furniture and appliances, delivery is handled by our
          in-house logistics team or specialized freight partners. Our team will
          coordinate a delivery schedule with you after your order is confirmed.
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Please ensure someone is available at the delivery address to receive
          and inspect the items upon arrival.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "Damaged or Lost Shipments",
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
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    content: (
      <>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          If your order arrives damaged or does not arrive within the expected
          timeframe, contact us immediately. We will coordinate with the courier
          and resolve the issue as quickly as possible.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="mailto:info@afhome.biz"
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            info@afhome.biz
          </a>
          <a
            href="tel:028400290"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            02-840 0290
          </a>
        </div>
      </>
    ),
  },
]

export default function ShippingInfoPage() {
  return (
    <LegalPageShell
      title="Shipping Info"
      subtitle="Everything you need to know about how we deliver your order."
    >
      {/* Hero banner */}
      <div className="not-prose mb-8 overflow-hidden rounded-2xl bg-linear-to-br from-sky-500 to-cyan-600 p-7 text-white shadow-lg shadow-sky-900/20">
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
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest uppercase opacity-70">
              AF Home · Logistics
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Fast, reliable delivery nationwide.
            </h2>
            <p className="mt-1 text-sm opacity-80">
              We deliver across the Philippines with trusted courier partners.
              Here's how it works.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
              <p className="text-sm font-bold">Nationwide</p>
              <p className="text-[10px] opacity-70">Coverage</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
              <p className="text-sm font-bold">1–2 Days</p>
              <p className="text-[10px] opacity-70">Processing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick nav pills */}
      <div className="not-prose mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <span
            key={s.number}
            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300"
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
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
                  Need shipping help?
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Our team will assist with any delivery concern.
                </p>
              </div>
            </div>
            <a
              href="/contact-us"
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Contact Us
            </a>
          </div>
          <div className="border-t border-sky-200/60 px-5 py-3 dark:border-sky-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shipping rates and timeframes are subject to change. Check this
              page regularly for the latest information.
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  )
}
