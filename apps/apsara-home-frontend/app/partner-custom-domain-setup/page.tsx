import type { ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  Globe2,
  Network,
  Server,
  Store,
} from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Partner Custom Domain Setup | AF Home",
  description:
    "Step-by-step internal guide for connecting client-owned domains to partner storefronts.",
}

const steps = [
  {
    title: "Save Domain Link",
    icon: Store,
    body: "Add the client domain in Partner Storefront Studio so the storefront record knows which host belongs to it.",
    items: [
      "Open Partner Storefront Studio.",
      "Select the partner storefront.",
      "Set Domain Link to https://clientdomain.com.",
      "Click Save Domain Link.",
    ],
  },
  {
    title: "Point DNS",
    icon: Network,
    body: "The client domain must point to our VPS public IP. Dokploy cannot receive the domain until DNS reaches the server.",
    items: [
      "A record: @ -> VPS public IP.",
      "CNAME record: www -> clientdomain.com.",
      "Ask for a screenshot if the client controls DNS.",
      "Use DNS only while testing if Cloudflare SSL or routing is not stable yet.",
    ],
  },
  {
    title: "Add Domain In Dokploy",
    icon: Server,
    body: "Attach the domain to the frontend service so Traefik routes the host to the Next.js container.",
    items: [
      "Service Name: frontend.",
      "Host: clientdomain.com.",
      "Path: / and Internal Path: /.",
      "Strip Path: off.",
      "Container Port: 3000.",
      "HTTPS on, Certificate Provider: Let's Encrypt.",
    ],
  },
  {
    title: "Validate And Test",
    icon: CheckCircle2,
    body: "After DNS and Dokploy are set, validate DNS and open the storefront route.",
    items: [
      "Click Validate DNS in Dokploy if available.",
      "Redeploy compose/app if Dokploy asks for it.",
      "Test https://clientdomain.com/shop.",
      "Also test https://www.clientdomain.com/shop.",
    ],
  },
]

const dnsRecords = [
  ["A", "@", "<VPS_PUBLIC_IP>", "Root domain points to our VPS"],
  ["CNAME", "www", "clientdomain.com", "www follows the root domain"],
]

const dokployFields = [
  ["Service Name", "frontend"],
  ["Host", "clientdomain.com"],
  ["Path", "/"],
  ["Internal Path", "/"],
  ["Strip Path", "Off"],
  ["Container Port", "3000"],
  ["HTTPS", "On"],
  ["Certificate Provider", "Let's Encrypt"],
]

function CodeLine({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-slate-950 px-2 py-1 font-mono text-xs text-emerald-300">
      {children}
    </code>
  )
}

function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold tracking-[0.22em] text-emerald-600 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
        {title}
      </h2>
      {children ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{children}</p>
      ) : null}
    </div>
  )
}

export default function PartnerCustomDomainSetupPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Globe2 className="h-4 w-4" />
              Partner Storefront Domains
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
              Client-Owned Domain Setup
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Use this guide when a partner already owns a domain and wants it
              connected to their AF Home partner storefront.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-bold tracking-[0.2em] text-emerald-300 uppercase">
              Required Pieces
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Domain Link saved in storefront studio
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                DNS points to the VPS public IP
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Dokploy routes the domain to frontend port 3000
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-white/10 p-4 text-xs leading-6 text-slate-200">
              Current safest entry point: <CodeLine>/shop</CodeLine>. Example:{" "}
              <CodeLine>https://clientdomain.com/shop</CodeLine>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
        <SectionTitle eyebrow="Workflow" title="Step-By-Step Setup">
          Follow these in order. Dokploy alone is not enough, and DNS alone is
          not enough. Both sides must be configured.
        </SectionTitle>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <article
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {step.body}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {step.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionTitle eyebrow="DNS" title="Records To Give The Client">
              If the client controls their own DNS, send these records. Replace
              the VPS value with the actual public IP.
            </SectionTitle>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {dnsRecords.map(([type, name, value, purpose]) => (
                    <tr key={`${type}-${name}`}>
                      <td className="px-4 py-3 font-semibold">{type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{value}</td>
                      <td className="px-4 py-3 text-slate-600">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SectionTitle eyebrow="Dokploy" title="Domain Fields">
              Add both root and www domains to the frontend service using these
              values.
            </SectionTitle>
            <div className="mt-5 grid gap-3">
              {dokployFields.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-slate-600">{label}</span>
                  <span className="font-mono text-xs font-bold text-slate-950">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
            <h2 className="text-lg font-bold text-amber-950">
              Common 404 Cause
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            If DNS points to the VPS but Dokploy does not have the domain added
            to the frontend service, the domain can show a generic 404 page.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-amber-950">
            <li>Check Service Name is frontend.</li>
            <li>Check Container Port is 3000.</li>
            <li>Check Path is /.</li>
            <li>Redeploy compose/app if Dokploy asks for it.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-bold">Cloudflare Notes</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            If we manage the domain in our Cloudflare, the client must point
            nameservers to our Cloudflare account. Otherwise, they keep their
            DNS provider and add the records we send.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            While testing SSL, use DNS only if proxied mode causes certificate
            or routing confusion. Re-enable proxy after HTTPS works.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-emerald-300 uppercase">
                Client Template
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Message To Send When Client Controls DNS
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
              <Copy className="h-4 w-4" />
              Copy manually from the block below
            </div>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-sm leading-7 text-slate-200">
{`Hi <Client Name>,

Please add these DNS records to your domain:

A record
Name: @
Value: <VPS_PUBLIC_IP>
TTL: Auto

CNAME record
Name: www
Value: <yourdomain.com>
TTL: Auto

After saving, please send us a screenshot. We will attach the domain to your storefront from our deployment side.

Thank you.`}
          </pre>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/partner/webpages/partner-storefronts"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-emerald-950 transition hover:bg-emerald-400"
            >
              Open Storefront Studio
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 font-bold text-white transition hover:bg-white/10"
            >
              Open System Docs
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
