'use client';

import { type ReactNode, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store, FileText, ShieldCheck, Palette, ListChecks, UserPlus, LogIn,
  LayoutDashboard, ShoppingBag, ReceiptText, Users, UserCog, RefreshCw,
  Download, ArrowRight, CheckCircle2, Sparkles, Rocket, Wallet, BadgeCheck,
  Globe, Clock, TrendingUp, Building2,
} from 'lucide-react';

/* ─── Tutorial data ──────────────────────────────────────────── */
type Phase = {
  id: string;
  kicker: string;
  title: string;
  blurb: string;
  accent: string; // tailwind gradient classes
  steps: Step[];
};

type Step = {
  n: number;
  icon: ReactNode;
  title: string;
  body: string;
  images: { src: string; alt: string }[];
};

const IMG = '/webstore-tutorial';

const PHASES: Phase[] = [
  {
    id: 'request',
    kicker: 'Phase 1',
    title: 'Request a Webstore',
    blurb: 'It all starts here — right from your AF Home profile.',
    accent: 'from-emerald-500 to-teal-500',
    steps: [
      {
        n: 1,
        icon: <FileText size={20} />,
        title: 'Request a Partner Webstore',
        body:
          'From your AF Home profile, open "Launch Your Partner Webstore". Choose a subscription plan (Quarterly, Semi-Annual, or Annual), fill in your Full Name, Slug Name, and Username, select a payment method (GCash / Card), agree to the Terms & Conditions, then submit your request.',
        images: [{ src: `${IMG}/01-webstore-request.jpg`, alt: 'Launch Your Partner Webstore request form on the AF Home profile' }],
      },
    ],
  },
  {
    id: 'review',
    kicker: 'Phase 2',
    title: 'Review & Approval',
    blurb: 'The AF Home Super Admin reviews your request.',
    accent: 'from-sky-500 to-blue-600',
    steps: [
      {
        n: 2,
        icon: <ShieldCheck size={20} />,
        title: 'Admin reviews the request',
        body:
          'The Super Admin sees your request under Dashboard → Inquiry → Webstore Requests. Each entry shows a ticket number, slug, display name, and status (Pending / Approved / Expired). Click "Subscription Details" to review the full information.',
        images: [{ src: `${IMG}/02-admin-webstore-requests.jpg`, alt: 'Webstore Requests list in the Super Admin dashboard' }],
      },
      {
        n: 3,
        icon: <BadgeCheck size={20} />,
        title: 'Subscription is checked and approved',
        body:
          'In Subscription Details, the admin sees the full summary: plan, billing, payment method, receipt, and payment reference number. Once it is Verified and Paid, the request is approved and the storefront can be created.',
        images: [{ src: `${IMG}/03-subscription-details.png`, alt: 'Subscription Details modal showing approved and paid status' }],
      },
    ],
  },
  {
    id: 'setup',
    kicker: 'Phase 3',
    title: 'Build the Storefront',
    blurb: 'The branded store is set up in Storefront Studio.',
    accent: 'from-violet-500 to-fuchsia-500',
    steps: [
      {
        n: 4,
        icon: <Store size={20} />,
        title: 'Create a new storefront',
        body:
          'In Storefront Studio, you start from a blank "Untitled Storefront". Here you set the Identity (slug, display name, hero title, hero subtitle), Brand Colors, and Brand Assets (logo and browser tab logo).',
        images: [{ src: `${IMG}/04-storefront-creation.jpg`, alt: 'A blank new storefront in Storefront Studio' }],
      },
      {
        n: 5,
        icon: <Palette size={20} />,
        title: 'Fill in all storefront details',
        body:
          'Complete everything: slug, display name, hero title and subtitle, theme and accent colors, logo and favicon, hero video, referral link, shop URL, and an optional domain link. This shapes your branded store — then click "Save Storefront".',
        images: [{ src: `${IMG}/05-fill-all-fields.jpg`, alt: 'Storefront Studio with all fields filled in' }],
      },
      {
        n: 6,
        icon: <UserPlus size={20} />,
        title: 'Create a partner user account',
        body:
          'Create a new user for the partner: full name, username, email (optional), and password. Then assign the storefront (e.g. AF STORE) so the partner has access, and click "Create User".',
        images: [{ src: `${IMG}/06-create-user.png`, alt: 'Create New User form with an assigned storefront' }],
      },
    ],
  },
  {
    id: 'portal',
    kicker: 'Phase 4',
    title: 'Partner Portal',
    blurb: 'This is where the partner manages their store.',
    accent: 'from-amber-500 to-orange-500',
    steps: [
      {
        n: 7,
        icon: <LogIn size={20} />,
        title: 'Log in to the Partner Portal',
        body:
          'Using the username and password created earlier, the partner signs in to the AF Home Partner Portal. Note: passwords are case-sensitive, and there is a Cloudflare verification before signing in.',
        images: [
          { src: `${IMG}/07-partner-login.jpg`, alt: 'Partner Portal login page' },
          { src: `${IMG}/08-af-store-login.png`, alt: 'AF Store partner login page' },
        ],
      },
      {
        n: 8,
        icon: <LayoutDashboard size={20} />,
        title: 'Manage storefront content',
        body:
          'In Partner Portal → Storefronts, the partner finds Storefront Studio, where they can update the identity, colors, assets, links, categories, and products of their store anytime.',
        images: [{ src: `${IMG}/09-storefront-dashboard.jpg`, alt: 'Storefront Studio inside the Partner Portal' }],
      },
      {
        n: 9,
        icon: <ShoppingBag size={20} />,
        title: 'Track Orders',
        body:
          'In the Orders tab, the partner sees all orders placed from their assigned storefront. Orders can be filtered by status or by category to keep track of sales.',
        images: [{ src: `${IMG}/10-partner-orders.jpg`, alt: 'Partner Orders page' }],
      },
      {
        n: 10,
        icon: <ReceiptText size={20} />,
        title: 'View Subscriptions',
        body:
          'Under Subscriptions, the partner sees the storefront’s subscription transactions — Total, Approved, Rejected, and Total Paid — along with the history of receipts and payment status.',
        images: [{ src: `${IMG}/11-subscriptions.jpg`, alt: 'Subscriptions transactions dashboard' }],
      },
      {
        n: 11,
        icon: <UserCog size={20} />,
        title: 'Manage Partner Users',
        body:
          'The partner can add or manage additional users with access to the storefront. Just assign which storefront they can view and edit.',
        images: [{ src: `${IMG}/12-partner-users.jpg`, alt: 'Partner User Accounts management' }],
      },
      {
        n: 12,
        icon: <Users size={20} />,
        title: 'Manage Members',
        body:
          'In Members, the partner can search, filter, and review member profiles by sponsor — for the networking and referral side of AF Home.',
        images: [{ src: `${IMG}/13-members.jpg`, alt: 'Members management page' }],
      },
      {
        n: 13,
        icon: <RefreshCw size={20} />,
        title: 'Renew the storefront',
        body:
          'When it is close to expiring, the partner can choose a new term in Renewal (Quarterly, Semi-Annual, Annual), select a billing option and payment method, then click "Start renewal payment" to keep the store active.',
        images: [{ src: `${IMG}/14-renewal.jpg`, alt: 'Storefront renewal page' }],
      },
    ],
  },
];

const ADVANTAGES = [
  { icon: <Clock size={18} />, title: 'Open 24/7', body: 'Your store keeps selling even while you sleep — no fixed store hours.' },
  { icon: <Globe size={18} />, title: 'Nationwide reach', body: 'Sell beyond your local area and reach customers all over the country.' },
  { icon: <Building2 size={18} />, title: 'No website to build', body: 'Get a professional online store without coding, hosting, or maintenance.' },
  { icon: <Wallet size={18} />, title: 'Low cost to start', body: 'Far cheaper than building your own e-commerce site from scratch.' },
  { icon: <ShieldCheck size={18} />, title: 'Ready-made operations', body: 'Tap into AF Home’s catalog, secure payments, and shipping right away.' },
  { icon: <TrendingUp size={18} />, title: 'Grow your income', body: 'Earn from every referral and scale your store anytime you want.' },
];

const BENEFITS = [
  { icon: <Sparkles size={18} />, title: 'Your own branded store', body: 'Custom slug, logo, colors, and hero — it looks like your own brand.' },
  { icon: <Rocket size={18} />, title: 'Launch fast', body: 'Just save and it goes live — no coding or deployment needed.' },
  { icon: <Wallet size={18} />, title: 'Earn from referrals', body: 'Your referral link tracks every order that comes through your store.' },
  { icon: <ListChecks size={18} />, title: 'You pick the products', body: 'Curate the categories and products that appear in your store.' },
  { icon: <ShieldCheck size={18} />, title: 'AF Home handles the backend', body: 'Payments (PayMongo), checkout, and shipping are all ready for you.' },
  { icon: <RefreshCw size={18} />, title: 'Easy to renew', body: 'Flexible plans — quarterly, semi-annual, or annual.' },
];

/* ─── Reusable bits ──────────────────────────────────────────── */
function StepImage({ src, alt }: { src: string; alt: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading="eager"
      className="w-full h-auto rounded-xl border border-zinc-200 bg-white shadow-sm"
    />
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function WebstoreTutorial() {
  const [printing, setPrinting] = useState(false);

  const handleSavePdf = useCallback(() => {
    setPrinting(true);
    // Give layout a tick to settle (e.g. lazy images), then open the print dialog.
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  }, []);

  const totalSteps = PHASES.reduce((sum, p) => sum + p.steps.length, 0);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 print:bg-white">
      {/* Print rules: hide chrome, force animated content visible */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          [data-animate] { opacity: 1 !important; transform: none !important; }
          .print-break { break-inside: avoid; page-break-inside: avoid; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* ── Sticky top bar ── */}
      <header className="no-print sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
              <Store size={18} />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">AF Home</p>
              <p className="text-sm font-bold text-zinc-800">Partner Webstore Guide</p>
            </div>
          </div>
          <button
            onClick={handleSavePdf}
            disabled={printing}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60"
          >
            <Download size={16} />
            {printing ? 'Preparing…' : 'Save as PDF'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-linear-to-br from-zinc-900 via-zinc-900 to-emerald-950 px-7 py-12 text-white print-break sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles size={13} /> Complete Guide
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              How to build your own<br className="hidden sm:block" /> AF Home Partner Webstore
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-300">
              A complete guide from request to a live store and renewal.
              {' '}
              <span className="font-semibold text-white">{totalSteps} steps</span>, split across{' '}
              <span className="font-semibold text-white">4 phases</span>.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#phase-request"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-400"
              >
                Get started <ArrowRight size={16} />
              </a>
              <button
                onClick={handleSavePdf}
                className="no-print inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Download size={16} /> Save as PDF
              </button>
            </div>
          </div>
        </section>

        {/* ── Advantages (why avail) ── */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-6 print-break sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
              <TrendingUp size={18} />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight text-zinc-900">Advantages of having your own webstore</h2>
              <p className="text-sm text-zinc-500">Why availing an AF Home webstore is worth it.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {ADVANTAGES.map((a) => (
              <div key={a.title} className="flex items-start gap-3 print-break">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                  {a.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-800">{a.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="mt-10 print-break">
          <h2 className="text-xl font-black tracking-tight text-zinc-900">Why an AF Home Partner Webstore?</h2>
          <p className="mt-1 text-sm text-zinc-500">What you get as a partner.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-zinc-200 bg-white p-4 print-break">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  {b.icon}
                </span>
                <p className="mt-3 text-sm font-bold text-zinc-800">{b.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Phases ── */}
        {PHASES.map((phase) => (
          <section key={phase.id} id={`phase-${phase.id}`} className="mt-14 scroll-mt-20">
            {/* Phase header */}
            <div className="flex items-center gap-4 print-break">
              <span className={`h-10 w-1.5 shrink-0 rounded-full bg-linear-to-b ${phase.accent}`} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">{phase.kicker}</p>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900">{phase.title}</h2>
                <p className="mt-0.5 text-sm text-zinc-500">{phase.blurb}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="mt-6 space-y-6">
              {phase.steps.map((step) => (
                <motion.article
                  key={step.n}
                  data-animate
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print-break"
                >
                  <div className="flex flex-col gap-5 p-5 sm:p-6">
                    {/* Step header */}
                    <div className="flex items-start gap-4">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${phase.accent} text-white shadow-sm`}>
                        {step.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            Step {step.n}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-lg font-bold leading-snug text-zinc-900">{step.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{step.body}</p>
                      </div>
                    </div>

                    {/* Screenshot(s) */}
                    <div className={step.images.length > 1 ? 'grid gap-4 sm:grid-cols-2' : ''}>
                      {step.images.map((img) => (
                        <StepImage key={img.src} src={img.src} alt={img.alt} />
                      ))}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        ))}

        {/* ── Closing CTA ── */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 px-7 py-12 text-center print-break">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
            <CheckCircle2 size={28} />
          </span>
          <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-900">That’s it — you’re ready!</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
            Your brand. Your curated products. Powered by AF Home. Request your webstore today and start selling.
          </p>
          <button
            onClick={handleSavePdf}
            className="no-print mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800"
          >
            <Download size={16} /> Save this guide as PDF
          </button>
        </section>

        <p className="mt-10 text-center text-xs text-zinc-400">© AF Home — Partner Webstore Guide</p>
      </main>
    </div>
  );
}
