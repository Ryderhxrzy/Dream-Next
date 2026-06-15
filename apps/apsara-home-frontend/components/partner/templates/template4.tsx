'use client'

import { useState } from 'react'

export interface Template4Props {
  storeName?: string
  tagline?: string
  description?: string
  primaryColor?: string
  navLogo?: string
  navLinks?: { label: string; href: string }[]
  heroImage?: string
  heroAlign?: 'left' | 'center' | 'right'
  heroBtnPrimary?: string
  heroBtnSecondary?: string
  heroBadge1?: string
  heroBadge2?: string
  heroBadge3?: string
  shopSlug?: string
  aboutTitle?: string
  aboutBody?: string
  aboutImage?: string
  aboutHighlights?: { icon: string; text: string }[]
  featuresTitle?: string
  featuresSubtitle?: string
  ctaTitle?: string
  ctaSubtitle?: string
  ctaBtnText?: string
  ctaEmail?: string
  ctaPhone?: string
  ctaAddress?: string
  socialFacebook?: string
  socialInstagram?: string
  socialX?: string
  stat1Value?: string; stat1Label?: string
  stat2Value?: string; stat2Label?: string
  stat3Value?: string; stat3Label?: string
  stat4Value?: string; stat4Label?: string
  stat5Value?: string; stat5Label?: string
  selectedSection?: string | null
  onSectionClick?: (section: string) => void
  /** Set to true by the studio when in mobile preview mode so the nav shows the hamburger
   *  instead of relying on viewport breakpoints (which don't match the preview box width). */
  previewMobile?: boolean
}

function S({
  id, label, selected, onClick, children,
}: {
  id: string
  label: string
  selected: boolean
  onClick?: (id: string) => void
  children: React.ReactNode
}) {
  if (!onClick) return <div id={id}>{children}</div>
  return (
    <div
      id={id}
      role="button"
      tabIndex={0}
      onClick={() => onClick(id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(id)}
      className={`group relative cursor-pointer transition-all outline-none ${
        selected
          ? 'ring-2 ring-inset ring-indigo-500'
          : 'hover:ring-1 hover:ring-inset hover:ring-indigo-300'
      }`}
    >
      <div
        className={`pointer-events-none absolute left-2 top-2 z-50 rounded-lg px-2 py-1 text-[10px] font-semibold text-white shadow transition-opacity ${
          selected
            ? 'bg-indigo-600 opacity-100'
            : 'bg-black/50 opacity-0 backdrop-blur-sm group-hover:opacity-100'
        }`}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

export default function Template4({
  storeName        = 'Nexora',
  tagline          = 'Smart Solutions for Growing Businesses',
  description      = 'We help businesses streamline operations, improve efficiency, and grow with confidence.',
  primaryColor     = '#2563eb',
  navLogo,
  navLinks: navLinksProp,
  heroAlign        = 'left',
  heroBtnSecondary = 'Learn More',
  heroBadge1,
  heroBadge2,
  heroBadge3,
  shopSlug,
  aboutTitle       = "We're on a mission to empower businesses",
  aboutBody        = 'Nexora is a technology company focused on providing innovative and scalable solutions that help businesses succeed in the digital era.',
  aboutImage,
  heroImage,
  aboutHighlights,
  featuresTitle    = 'Solutions Built for Your Business',
  featuresSubtitle = 'Everything you need to launch, manage, and scale your online business.',
  ctaTitle         = "Let's Build Something Great Together",
  ctaSubtitle      = 'Have a question or want to learn more? Our team is here to help you succeed.',
  ctaBtnText       = 'Get in Touch',
  ctaEmail         = 'hello@yourstore.com',
  ctaPhone         = '+1 (555) 123-4567',
  ctaAddress       = '123 Business Ave, New York, NY 10001',
  socialFacebook,
  socialInstagram,
  socialX,
  stat1Value = '10,000+', stat1Label = 'Happy Customers',
  stat2Value = '500,000+', stat2Label = 'Orders Processed',
  stat3Value = '99.9%',   stat3Label = 'System Uptime',
  stat4Value = '50+',     stat4Label = 'Countries Served',
  stat5Value = '24/7',    stat5Label = 'Customer Support',
  selectedSection,
  onSectionClick,
  previewMobile = false,
}: Template4Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const sel = (id: string) => selectedSection === id

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return
    e.preventDefault()
    setMobileOpen(false)
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const defaultNavLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'About Us', href: '#about' },
    { label: 'Products', href: '#features' },
    { label: 'Contact', href: '#cta' },
  ]
  const navLinks = navLinksProp?.length ? navLinksProp : defaultNavLinks

  const defaultHighlights = [
    { icon: '✓', text: 'Customer-first approach' },
    { icon: '✓', text: 'Innovative & scalable solutions' },
    { icon: '✓', text: 'Secure & reliable technology' },
    { icon: '✓', text: 'Dedicated support, always' },
  ]
  const highlights = aboutHighlights?.length ? aboutHighlights : defaultHighlights

  const trustBadge1 = heroBadge1 ?? highlights[0]?.text ?? 'Secure & Reliable'
  const trustBadge2 = heroBadge2 ?? highlights[1]?.text ?? 'High Performance'
  const trustBadge3 = heroBadge3 ?? highlights[2]?.text ?? '24/7 Support'

  const aboutPhoto = aboutImage || heroImage

  const heroTextAlign = heroAlign === 'center' ? 'text-center' : heroAlign === 'right' ? 'text-right' : 'text-left'
  const heroBtnAlign  = heroAlign === 'center' ? 'justify-center' : heroAlign === 'right' ? 'justify-end' : 'justify-start'

  const features = [
    {
      color: '#2563eb', bg: '#eff6ff',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#2563eb" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18M3 9h18M9 3v18M3 21h6" /><rect x="13" y="13" width="8" height="8" rx="1" strokeLinecap="round" /></svg>,
      title: 'E-Commerce Platform',
      desc: 'Create seamless shopping experiences and grow your online business.',
    },
    {
      color: '#16a34a', bg: '#f0fdf4',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#16a34a" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3H8L6 7h12l-2-4z" /></svg>,
      title: 'Inventory Management',
      desc: 'Track inventory in real-time and manage stock across multiple locations.',
    },
    {
      color: '#7c3aed', bg: '#f5f3ff',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#7c3aed" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-5 4 3 4-6" /></svg>,
      title: 'Analytics & Insights',
      desc: 'Make data-driven decisions with powerful analytics and custom reports.',
    },
    {
      color: '#ea580c', bg: '#fff7ed',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#ea580c" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" strokeLinecap="round" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      title: 'Customer Engagement',
      desc: 'Build lasting relationships with powerful tools across multiple channels.',
    },
    {
      color: '#0891b2', bg: '#ecfeff',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0891b2" strokeWidth={1.8}><circle cx="12" cy="12" r="3" strokeLinecap="round" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>,
      title: 'Automation Tools',
      desc: 'Automate workflows and save time with smart automation.',
    },
  ]

  const statsData = [
    { value: stat1Value, label: stat1Label, color: '#2563eb', bg: '#eff6ff',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#2563eb" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg> },
    { value: stat2Value, label: stat2Label, color: '#0891b2', bg: '#ecfeff',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0891b2" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" /></svg> },
    { value: stat3Value, label: stat3Label, color: '#d97706', bg: '#fffbeb',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#d97706" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
    { value: stat4Value, label: stat4Label, color: '#059669', bg: '#ecfdf5',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#059669" strokeWidth={1.8}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg> },
    { value: stat5Value, label: stat5Label, color: '#ea580c', bg: '#fff7ed',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#ea580c" strokeWidth={1.8}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg> },
  ]

  // Outer div gives the sticky nav a containing block spanning the full page height.
  // Without it, the S wrapper (same height as the nav) ends the sticky constraint immediately.
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/*
        Nav is NOT wrapped in <S> — <S> renders a block-level <div> that becomes the
        sticky element's containing block. When that div's height equals the nav's
        height, the sticky constraint is violated on the first scroll pixel and the
        nav scrolls away. Studio click-to-edit is inlined directly on <nav> so the
        outer wrapper div (full page height) is the containing block → sticky works.
      */}
      <nav
        id="nav"
        className={`sticky top-0 z-50 border-b border-slate-100 bg-white outline-none transition-all
          ${onSectionClick ? 'group cursor-pointer' : ''}
          ${sel('nav') ? 'ring-2 ring-inset ring-indigo-500' : onSectionClick ? 'hover:ring-1 hover:ring-inset hover:ring-indigo-300' : ''}`}
        onClick={onSectionClick ? () => onSectionClick('nav') : undefined}
        role={onSectionClick ? 'button' : undefined}
        tabIndex={onSectionClick ? 0 : undefined}
        onKeyDown={onSectionClick ? (e) => e.key === 'Enter' && onSectionClick('nav') : undefined}
      >
        {onSectionClick && (
          <div className={`pointer-events-none absolute left-2 top-2 z-50 rounded-lg px-2 py-1 text-[10px] font-semibold text-white shadow transition-opacity
            ${sel('nav') ? 'bg-indigo-600 opacity-100' : 'bg-black/50 opacity-0 backdrop-blur-sm group-hover:opacity-100'}`}>
            Nav
          </div>
        )}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${previewMobile ? '' : 'md:px-10 md:py-4'}`}>
          {/* Logo */}
          <div className="flex min-w-0 items-center gap-2">
            {navLogo
              ? <img src={navLogo} alt={storeName} className={`w-auto shrink-0 rounded-xl object-contain ${previewMobile ? 'h-8' : 'h-8 md:h-10'}`} />
              : <div className={`flex shrink-0 items-center justify-center rounded-full text-white text-xs font-black ${previewMobile ? 'h-7 w-7' : 'h-7 w-7 md:h-8 md:w-8'}`} style={{ backgroundColor: primaryColor }}>
                  {storeName.charAt(0)}
                </div>
            }
            <span className={`truncate font-black tracking-tight text-slate-900 ${previewMobile ? 'text-sm' : 'text-sm md:text-base'}`}>{storeName}</span>
          </div>

          {/* Desktop nav links — hidden on mobile */}
          {!previewMobile && (
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
              {navLinks.map((l, i) => (
                <a key={l.label} href={l.href}
                  onClick={(e) => { e.stopPropagation(); scrollTo(e, l.href) }}
                  className={`cursor-pointer whitespace-nowrap transition hover:text-slate-900 ${i === 0 ? 'border-b-2 font-semibold text-slate-900' : ''}`}
                  style={i === 0 ? { borderColor: primaryColor } : {}}>
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {/* Right: Shop Now + hamburger */}
          <div className="flex shrink-0 items-center gap-2">
            <a href={shopSlug ? `/shop/${shopSlug}` : '#'}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-lg bg-[#111827] font-semibold text-white transition hover:bg-[#1f2937] ${previewMobile ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm'}`}>
              Shop Now
            </a>
            {/* Hamburger — always visible in mobile preview, viewport-gated on live page */}
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 active:scale-90 ${previewMobile ? '' : 'md:hidden'}`}
              onClick={(e) => { e.stopPropagation(); setMobileOpen((o) => !o) }}
              aria-label="Toggle menu"
            >
              <div className="flex w-4.5 flex-col gap-1.25">
                <span className={`block h-0.5 w-full rounded-full bg-current transition-all duration-300 ease-in-out ${mobileOpen ? 'translate-y-1.75 rotate-45' : ''}`} />
                <span className={`block h-0.5 w-full rounded-full bg-current transition-all duration-300 ease-in-out ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
                <span className={`block h-0.5 w-full rounded-full bg-current transition-all duration-300 ease-in-out ${mobileOpen ? '-translate-y-1.75 -rotate-45' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown — slide-down animation via max-h transition */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${previewMobile ? '' : 'md:hidden'} ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col gap-1 border-t border-slate-100 px-4 pb-4 pt-3">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href}
                onClick={(e) => { e.stopPropagation(); scrollTo(e, l.href) }}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* @container so all breakpoints respond to THIS element's width, not the viewport */}
      <div className="@container bg-white font-sans text-[#1e293b] overflow-x-clip">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <S id="hero" label="Hero" selected={sel('hero')} onClick={onSectionClick}>
        <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 @md:grid-cols-2 @md:px-16 @md:py-20">
          <div className={heroTextAlign}>
            <h1 className="text-2xl font-black leading-tight text-slate-900 @xs:text-3xl @sm:text-4xl @lg:text-5xl">{tagline}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{description}</p>
            <div className={`mt-5 flex flex-wrap gap-2 @sm:gap-3 ${heroBtnAlign}`}>
              <a href={shopSlug ? `/shop/${shopSlug}` : '#'}
                className="inline-block rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f2937] @sm:px-6 @sm:py-3">
                Shop Now
              </a>
              <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 @sm:px-6 @sm:py-3">
                {heroBtnSecondary}
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className={`mt-5 flex flex-wrap items-center gap-3 ${heroBtnAlign}`}>
              {[
                { label: trustBadge1, icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
                { label: trustBadge2, icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> },
                { label: trustBadge3, icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg> },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 @sm:gap-1.5 @sm:text-xs">
                  <span className="text-slate-400">{b.icon}</span>
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard mockup — hidden below @md */}
          <div className="relative hidden @md:block">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xl" style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.12)' }}>
              <div className="mb-3 flex items-center gap-4 border-b border-slate-100 pb-3">
                <span className="border-b-2 pb-3 -mb-3 text-xs font-semibold text-slate-800" style={{ borderColor: primaryColor }}>Overview</span>
                <span className="text-xs text-slate-400">Analytics</span>
                <span className="text-xs text-slate-400">Reports</span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 @lg:grid-cols-4">
                {[
                  { label: 'Total Revenue', value: '$128,840', delta: '+1.4%' },
                  { label: 'Orders',        value: '3,482',    delta: '+2.4%' },
                  { label: 'Products',      value: '2,598',    delta: '+1.4%' },
                  { label: 'Conversion',    value: '4.8%',     delta: '+1.4%' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-slate-50 px-2 py-2">
                    <p className="text-[9px] text-slate-400 leading-tight">{s.label}</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-800">{s.value}</p>
                    <p className="mt-0.5 text-[9px] font-semibold text-emerald-500">{s.delta}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 rounded-lg bg-slate-50 p-2.5">
                  <p className="mb-1 text-[10px] font-semibold text-slate-500">Revenue Overview</p>
                  <svg viewBox="0 0 200 70" className="w-full" style={{ height: 70 }}>
                    <defs>
                      <linearGradient id="t4g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[20, 40, 60].map((y) => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />)}
                    <path d="M0,58 C20,50 35,30 50,38 C65,46 80,15 100,20 C120,25 135,38 155,28 C170,20 185,32 200,24 L200,70 L0,70 Z" fill="url(#t4g)" />
                    <path d="M0,58 C20,50 35,30 50,38 C65,46 80,15 100,20 C120,25 135,38 155,28 C170,20 185,32 200,24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {([[50,38],[100,20],[155,28],[200,24]] as [number,number][]).map(([x,y],i) => (
                      <circle key={i} cx={x} cy={y} r="3" fill="white" stroke={primaryColor} strokeWidth="1.5" />
                    ))}
                  </svg>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="mb-1 text-[10px] font-semibold text-slate-500">Top Products</p>
                  <svg viewBox="0 0 60 60" className="mx-auto w-14 h-14">
                    <circle cx="30" cy="30" r="22" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle cx="30" cy="30" r="22" fill="none" stroke={primaryColor} strokeWidth="8" strokeDasharray="49 89" strokeDashoffset="-22" strokeLinecap="round" />
                    <circle cx="30" cy="30" r="22" fill="none" stroke="#7c3aed" strokeWidth="8" strokeDasharray="35 103" strokeDashoffset="27" strokeLinecap="round" />
                    <circle cx="30" cy="30" r="22" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="16 122" strokeDashoffset="62" strokeLinecap="round" />
                  </svg>
                  <div className="mt-1 space-y-1">
                    {[
                      { label: 'Product A', color: primaryColor, pct: '35%' },
                      { label: 'Product B', color: '#7c3aed',    pct: '25%' },
                      { label: 'Others',    color: '#f59e0b',    pct: '20%' },
                    ].map((p) => (
                      <div key={p.label} className="flex items-center justify-between text-[9px]">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-slate-500">{p.label}</span>
                        </div>
                        <span className="font-semibold text-slate-700">{p.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </S>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <S id="stats" label="Stats" selected={sel('stats')} onClick={onSectionClick}>
        <section className="bg-slate-50 px-4 py-10 @md:px-16 @md:py-12">
          <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400 @sm:mb-8 @sm:text-xs">
            Trusted by Businesses Worldwide
          </p>
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6 @lg:flex-nowrap @lg:gap-8">
            {statsData.map((s) => (
              <div key={s.label} className="flex w-[calc(50%-12px)] flex-col items-center gap-2 text-center @sm:w-[calc(33.333%-16px)] @lg:w-auto @lg:flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full @sm:h-12 @sm:w-12" style={{ backgroundColor: s.bg }}>
                  {s.icon}
                </div>
                <p className="text-lg font-black text-slate-900 @sm:text-xl">{s.value}</p>
                <p className="text-[10px] text-slate-400 @sm:text-[11px]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      </S>

      {/* ── About ─────────────────────────────────────────────── */}
      <S id="about" label="About" selected={sel('about')} onClick={onSectionClick}>
        <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 @md:grid-cols-2 @md:px-16 @md:py-24">
          <div className="relative overflow-hidden rounded-2xl shadow-lg @sm:rounded-3xl">
            {aboutPhoto
              ? <img src={aboutPhoto} alt="About" className="h-48 w-full object-cover @xs:h-56 @sm:h-80 @md:h-96" />
              : <div className="flex h-48 items-center justify-center bg-slate-100 @xs:h-56 @sm:h-80"><span className="text-5xl @sm:text-6xl">🏢</span></div>
            }
            <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/90 px-3 py-2 shadow backdrop-blur-sm @sm:bottom-4 @sm:left-4 @sm:right-4 @sm:px-4 @sm:py-3">
              <p className="text-xs font-bold text-slate-800">Better Solutions</p>
              <p className="text-[11px] text-slate-500">Better Future</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest @sm:mb-3 @sm:text-xs" style={{ color: primaryColor }}>About Us</p>
            <h2 className="text-xl font-black leading-tight text-slate-900 @xs:text-2xl @sm:text-3xl @lg:text-4xl">{aboutTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{aboutBody}</p>
            <ul className="mt-5 space-y-2.5 @sm:space-y-3">
              {highlights.map((h) => (
                <li key={h.text} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke={primaryColor} strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-5" />
                  </svg>
                  {h.text}
                </li>
              ))}
            </ul>
            <button type="button" className="mt-6 rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f2937] @sm:mt-8 @sm:px-6 @sm:py-3">
              Learn More About Us
            </button>
          </div>
        </section>
      </S>

      {/* ── Features ─────────────────────────────────────────── */}
      <S id="features" label="Features" selected={sel('features')} onClick={onSectionClick}>
        <section className="px-4 py-10 @md:px-16 @md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center @sm:mb-10">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest @sm:text-xs" style={{ color: primaryColor }}>Products</p>
              <h2 className="text-xl font-black text-slate-900 @xs:text-2xl @sm:text-3xl">{featuresTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">{featuresSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 @xs:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-5">
              {features.map((f) => (
                <div key={f.title} className="flex flex-row items-start gap-3 rounded-xl border border-slate-100 p-3 @lg:flex-col @lg:border-none @lg:p-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl @sm:h-10 @sm:w-10" style={{ backgroundColor: f.bg }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </S>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <S id="cta" label="CTA" selected={sel('cta')} onClick={onSectionClick}>
        <section className="bg-slate-50 px-4 py-10 @md:px-16 @md:py-20">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 @md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest @sm:mb-3 @sm:text-xs" style={{ color: primaryColor }}>Contact Us</p>
              <h2 className="text-xl font-black leading-tight text-slate-900 @xs:text-2xl @sm:text-3xl">{ctaTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{ctaSubtitle}</p>
              <button type="button" className="mt-5 flex items-center gap-2 rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f2937] @sm:mt-7 @sm:px-6 @sm:py-3">
                {ctaBtnText}
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm @sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-5">
                <svg viewBox="0 0 400 240" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
                  {Array.from({ length: 12 }).map((_, i) => <line key={`v${i}`} x1={i * 36} y1="0" x2={i * 36} y2="240" stroke="#64748b" strokeWidth="0.5" />)}
                  {Array.from({ length: 8 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 32} x2="400" y2={i * 32} stroke="#64748b" strokeWidth="0.5" />)}
                </svg>
              </div>
              <div className="relative space-y-5">
                {[
                  { icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={primaryColor} strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path strokeLinecap="round" d="M2 8l10 6 10-6" /></svg>, text: ctaEmail },
                  { icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={primaryColor} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.04 1.21h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L7.09 9a16 16 0 0 0 7.91 7.91l1.16-1.16a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" /></svg>, text: ctaPhone },
                  { icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={primaryColor} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>, text: ctaAddress },
                ].filter((c) => c.text).map((c, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${primaryColor}12` }}>
                      {c.icon}
                    </div>
                    <p className="break-all text-sm text-slate-600">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </S>

      {/* ── Footer ───────────────────────────────────────────── */}
      <S id="footer" label="Footer" selected={sel('footer')} onClick={onSectionClick}>
        <footer className="border-t border-slate-100 bg-white px-4 py-6 @md:px-16 @md:py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 @md:flex-row @md:justify-between @md:gap-6">
            <div className="flex min-w-0 items-center gap-2">
              {navLogo
                ? <img src={navLogo} alt={storeName} className="h-6 w-auto shrink-0 object-contain" />
                : <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-black" style={{ backgroundColor: primaryColor }}>
                    {storeName.charAt(0)}
                  </div>
              }
              <span className="truncate text-sm font-black tracking-tight text-slate-900">{storeName}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
              {navLinks.map((l) => (
                <a key={l.label} href={l.href} onClick={(e) => scrollTo(e, l.href)} className="cursor-pointer transition hover:text-slate-800">{l.label}</a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {[
                { href: socialFacebook,  src: '/Images/icon_apps/fb.png',        alt: 'Facebook' },
                { href: socialInstagram, src: '/Images/icon_apps/instagram.png', alt: 'Instagram' },
                { href: socialX,         src: '/Images/icon_apps/x1.png',        alt: 'X' },
              ].map((s) =>
                s.href ? (
                  <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition hover:scale-110">
                    <img src={s.src} alt={s.alt} className="h-5 w-5 object-contain" />
                  </a>
                ) : (
                  <span key={s.alt} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200">
                    <img src={s.src} alt={s.alt} className="h-5 w-5 object-contain opacity-60" />
                  </span>
                )
              )}
            </div>
          </div>
          <p className="mt-5 text-center text-[11px] text-slate-400">© {new Date().getFullYear()} {storeName}, Inc. All rights reserved.</p>
        </footer>
      </S>

      </div>
    </div>
  )
}
