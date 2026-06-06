'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useGetAdminMeQuery } from '@/store/api/authApi'
import {
  ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Eye,
  GripVertical, ImageIcon, LayoutGrid, Loader2, Monitor,
  Palette, Plus, Smartphone, Trash2, Type, Upload, X, Layout, Zap, TrendingUp,
} from 'lucide-react'
import { showErrorToast, showSuccessToast } from '@/libs/toast'
import { getPartnerStorefrontConfig } from '@/libs/partnerStorefront'
import {
  useGetAdminWebPageItemsQuery,
  useUpdateAdminWebPageItemMutation,
  type WebPageItem,
} from '@/store/api/webPagesApi'
import Template4Component from '@/components/partner/templates/template4'

const mkId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

/* ─────────────────────────────────────────────────────────────
   Block type definitions
───────────────────────────────────────────────────────────── */
interface NavLink { label: string; href: string }
interface NavBlock { id: string; type: 'nav'; storeName: string; logo: string; primaryColor: string; bg: string; textColor: string; links: NavLink[] }
interface HeroBlock { id: string; type: 'hero'; tagline: string; description: string; bgImage: string; overlayColor: string; overlayOpacity: number; primaryColor: string; btnPrimary: string; btnSecondary: string; align: 'left' | 'center' | 'right'; badge: string; badge1?: string; badge2?: string; badge3?: string }
interface StatsBlock { id: string; type: 'stats'; items: { value: string; label: string }[]; bg: string; valueColor: string; labelColor: string }
interface FeatureItem { icon: string; title: string; desc: string }
interface FeaturesBlock { id: string; type: 'features'; title: string; subtitle: string; items: FeatureItem[]; columns: 2 | 3; bg: string; cardBg: string; textColor: string; accentColor: string }
interface TextBlock { id: string; type: 'text'; title: string; body: string; align: 'left' | 'center' | 'right'; bg: string; textColor: string }
interface TestimonialBlock { id: string; type: 'testimonial'; text: string; author: string; bg: string; textColor: string }
interface CtaBlock { id: string; type: 'cta'; title: string; subtitle: string; btnText: string; btnColor: string; bg: string; textColor: string }
interface ImageBlock { id: string; type: 'image'; src: string; alt: string; caption: string; fullWidth: boolean }
interface AboutHighlight { icon: string; text: string }
interface AboutBlock { id: string; type: 'about'; heading: string; subheading: string; story: string; image: string; highlights: AboutHighlight[]; bg: string; textColor: string; accentColor: string }
interface FooterLink { label: string; href: string }
interface FooterBlock { id: string; type: 'footer'; storeName: string; tagline: string; copyrightText: string; email: string; phone: string; address?: string; socialFacebook?: string; socialInstagram?: string; socialX?: string; links: FooterLink[]; bg: string; textColor: string }
type Block = NavBlock | HeroBlock | StatsBlock | FeaturesBlock | TextBlock | TestimonialBlock | CtaBlock | ImageBlock | AboutBlock | FooterBlock

/* ─────────────────────────────────────────────────────────────
   Block factories
───────────────────────────────────────────────────────────── */
const DEFAULT_NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '#hero' },
  { label: 'Products', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#cta' },
]
const mkNav = (o: Partial<Omit<NavBlock,'id'|'type'>> = {}): NavBlock => ({ id: mkId(), type: 'nav', storeName: 'Your Store', logo: '', primaryColor: '#6366f1', bg: '#0a0a0f', textColor: '#ffffff', links: DEFAULT_NAV_LINKS, ...o })
const mkHero = (o: Partial<Omit<HeroBlock,'id'|'type'>> = {}): HeroBlock => ({ id: mkId(), type: 'hero', tagline: 'Sell Premium Furniture Under Your Brand', description: 'No inventory. No warehouse. Just your brand powered by Apsara Home.', bgImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80', overlayColor: '#000000', overlayOpacity: 55, primaryColor: '#6366f1', btnPrimary: 'Browse Collection', btnSecondary: 'Learn More', align: 'center', badge: 'Partner Storefront', ...o })
const mkStats = (o: Partial<Omit<StatsBlock,'id'|'type'>> = {}): StatsBlock => ({ id: mkId(), type: 'stats', items: [{ value: '500+', label: 'Products' }, { value: '98%', label: 'Satisfaction' }, { value: '₱0', label: 'Inventory Cost' }, { value: '24h', label: 'Support' }], bg: '#111827', valueColor: '#f59e0b', labelColor: '#6b7280', ...o })
const mkFeatures = (o: Partial<Omit<FeaturesBlock,'id'|'type'>> = {}): FeaturesBlock => ({ id: mkId(), type: 'features', title: 'Why Choose Us', subtitle: "Everything you need, nothing you don't.", columns: 3, items: [{ icon: '🛋️', title: 'Curated Catalog', desc: 'Premium furniture sourced and quality-checked.' }, { icon: '🎨', title: 'Your Brand', desc: 'Your logo, your colors, your store.' }, { icon: '📦', title: 'Zero Logistics', desc: 'We handle storage, packing, and delivery.' }, { icon: '💰', title: 'Earn Commissions', desc: 'Get paid on every completed order.' }, { icon: '⚡', title: 'Launch in Days', desc: 'Go live fast. No technical setup required.' }, { icon: '📊', title: 'Live Dashboard', desc: 'Track orders and performance in real time.' }], bg: '#f8fafc', cardBg: '#ffffff', textColor: '#1e293b', accentColor: '#6366f1', ...o })
const mkText = (o: Partial<Omit<TextBlock,'id'|'type'>> = {}): TextBlock => ({ id: mkId(), type: 'text', title: 'About Our Store', body: 'We provide everything you need to run a successful online furniture store.', align: 'center', bg: '#ffffff', textColor: '#1e293b', ...o })
const mkAbout = (o: Partial<Omit<AboutBlock,'id'|'type'>> = {}): AboutBlock => ({
  id: mkId(), type: 'about',
  heading: 'About Us',
  subheading: 'Who we are and what we stand for',
  story: 'We are a passionate team dedicated to bringing beautiful, high-quality furniture to every home. Founded with a vision to make premium living accessible, we partner with Apsara Home to deliver the best products and service.',
  image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800&q=80',
  highlights: [
    { icon: '🏠', text: 'Family-owned and operated' },
    { icon: '🌿', text: 'Committed to quality and sustainability' },
    { icon: '🤝', text: 'Trusted by thousands of customers' },
  ],
  bg: '#ffffff', textColor: '#1e293b', accentColor: '#6366f1', ...o,
})
const mkTestimonial = (o: Partial<Omit<TestimonialBlock,'id'|'type'>> = {}): TestimonialBlock => ({ id: mkId(), type: 'testimonial', text: 'Launching my furniture store was a dream. With this platform, it became reality in less than a week.', author: 'Partner since 2024', bg: '#f97316', textColor: '#ffffff', ...o })
const mkCta = (o: Partial<Omit<CtaBlock,'id'|'type'>> = {}): CtaBlock => ({ id: mkId(), type: 'cta', title: 'Ready to Start Selling?', subtitle: 'Join hundreds of partners already earning with us.', btnText: 'Become a Partner', btnColor: '#6366f1', bg: '#0f172a', textColor: '#ffffff', ...o })
const mkImage = (o: Partial<Omit<ImageBlock,'id'|'type'>> = {}): ImageBlock => ({ id: mkId(), type: 'image', src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=80', alt: 'Furniture showcase', caption: '', fullWidth: true, ...o })
const mkFooter = (o: Partial<Omit<FooterBlock,'id'|'type'>> = {}): FooterBlock => ({
  id: mkId(), type: 'footer',
  storeName: 'Your Store',
  tagline: 'Your trusted furniture partner.',
  copyrightText: 'Powered by Apsara Home',
  email: 'hello@yourstore.com',
  phone: '+63 912 345 6789',
  links: [
    { label: 'Home', href: '#hero' },
    { label: 'Products', href: '#features' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#cta' },
  ],
  bg: '#0a0a0f', textColor: '#ffffff', ...o,
})

/* ─────────────────────────────────────────────────────────────
   Template default block sets
───────────────────────────────────────────────────────────── */
const TEMPLATE_DEFAULTS: Record<string, () => Block[]> = {
  template1: () => [
    mkNav({ bg: '#0a0a0f', primaryColor: '#6366f1', textColor: '#ffffff' }),
    mkHero({ primaryColor: '#6366f1', overlayColor: '#000000', overlayOpacity: 55, align: 'center' }),
    mkAbout({ bg: '#0f172a', textColor: '#e2e8f0', accentColor: '#6366f1' }),
    mkStats({ bg: '#111827', valueColor: '#f59e0b', labelColor: '#6b7280' }),
    mkFeatures({ bg: '#0f172a', cardBg: '#1e293b', textColor: '#e2e8f0', accentColor: '#6366f1' }),
    mkCta({ bg: '#0f172a', btnColor: '#6366f1', textColor: '#ffffff' }),
    mkFooter({ bg: '#0a0a0f', textColor: '#ffffff' }),
  ],
  template2: () => [
    mkNav({ bg: '#ffffff', primaryColor: '#f97316', textColor: '#1e293b' }),
    mkHero({ primaryColor: '#f97316', overlayColor: '#0f172a', overlayOpacity: 45, align: 'left' }),
    mkAbout({ bg: '#faf7f3', textColor: '#1e293b', accentColor: '#f97316' }),
    mkFeatures({ bg: '#ffffff', cardBg: '#f8fafc', textColor: '#1e293b', accentColor: '#f97316' }),
    mkTestimonial({ bg: '#f97316', textColor: '#ffffff' }),
    mkStats({ bg: '#ffffff', valueColor: '#f97316', labelColor: '#6b7280' }),
    mkCta({ bg: '#fff7ed', btnColor: '#f97316', textColor: '#1e293b' }),
    mkFooter({ bg: '#f1f5f9', textColor: '#64748b' }),
  ],
  template3: () => [
    mkNav({ bg: '#0f0c29', primaryColor: '#7c3aed', textColor: '#ffffff' }),
    mkHero({ primaryColor: '#7c3aed', overlayColor: '#7c3aed', overlayOpacity: 65, align: 'center' }),
    mkAbout({ bg: '#1a1535', textColor: '#e2e8f0', accentColor: '#a78bfa' }),
    mkStats({ bg: '#302b63', valueColor: '#a78bfa', labelColor: '#94a3b8' }),
    mkFeatures({ bg: '#24243e', cardBg: '#302b63', textColor: '#e2e8f0', accentColor: '#a78bfa' }),
    mkCta({ bg: '#4c1d95', btnColor: '#a78bfa', textColor: '#ffffff' }),
    mkFooter({ bg: '#0f0c29', textColor: '#ffffff' }),
  ],
  template4: () => [
    mkNav({ bg: '#ffffff', primaryColor: '#2563eb', textColor: '#1e293b' }),
    mkHero({ primaryColor: '#2563eb', overlayColor: '#1e293b', overlayOpacity: 35, align: 'left',
      bgImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80',
      badge1: 'Customer-first approach', badge2: 'Innovative & scalable solutions', badge3: 'Secure & reliable technology' }),
    mkStats({ bg: '#f8fafc', valueColor: '#2563eb', labelColor: '#64748b', items: [
      { value: '10,000+', label: 'Happy Customers' },
      { value: '500,000+', label: 'Orders Processed' },
      { value: '99.9%', label: 'System Uptime' },
      { value: '50+', label: 'Countries Served' },
      { value: '24/7', label: 'Customer Support' },
    ]}),
    mkAbout({ bg: '#ffffff', textColor: '#1e293b', accentColor: '#2563eb',
      heading: "We're on a mission to empower businesses",
      story: 'We are a technology company focused on providing innovative and scalable solutions that help businesses succeed in the digital era.',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
      highlights: [
        { icon: '🎯', text: 'Customer-first approach' },
        { icon: '🚀', text: 'Innovative & scalable solutions' },
        { icon: '🔒', text: 'Secure & reliable technology' },
        { icon: '🤝', text: 'Dedicated support, always' },
      ],
    }),
    mkFeatures({ bg: '#f8fafc', cardBg: '#ffffff', textColor: '#1e293b', accentColor: '#2563eb', columns: 3,
      title: 'Why Choose Us',
      subtitle: "Everything you need, nothing you don't.",
      items: [
        { icon: '🛒', title: 'E-Commerce Platform', desc: 'Create seamless shopping experiences and grow your online business.' },
        { icon: '📦', title: 'Inventory Management', desc: 'Track inventory in real-time and manage stock across multiple locations.' },
        { icon: '📊', title: 'Analytics & Insights', desc: 'Make data-driven decisions with powerful analytics and custom reports.' },
        { icon: '👥', title: 'Customer Engagement', desc: 'Build lasting relationships with powerful tools across multiple channels.' },
        { icon: '⚡', title: 'Automation Tools', desc: 'Automate workflows and save time with smart automation.' },
      ],
    }),
    mkCta({ bg: '#eff6ff', btnColor: '#2563eb', textColor: '#1e293b' }),
    mkFooter({ bg: '#0f172a', textColor: '#94a3b8' }),
  ],
}

/* ─────────────────────────────────────────────────────────────
   Block renderers
───────────────────────────────────────────────────────────── */
function RenderNav({ b, compact, shopSlug }: { b: NavBlock; compact?: boolean; shopSlug?: string }) {
  return (
    <nav className={`flex items-center justify-between py-4 ${compact ? 'px-4' : 'px-4 md:px-10'}`} style={{ backgroundColor: b.bg, borderBottom: `1px solid ${b.textColor}20` }}>
      <div className="flex items-center gap-2.5">
        {b.logo && (
          <img src={b.logo} alt="logo" className="h-12 w-12 rounded-2xl object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <span className="text-lg font-black tracking-tight" style={{ color: b.textColor }}>{b.storeName}</span>
      </div>
      <div className={`items-center gap-6 text-sm ${compact ? 'hidden' : 'hidden md:flex'}`}>
        {(b.links ?? DEFAULT_NAV_LINKS).map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="cursor-pointer transition-opacity hover:opacity-100"
            style={{ color: `${b.textColor}80` }}
            onClick={(e) => {
              e.preventDefault()
              const target = document.querySelector(link.href)
              target?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
      <a
        href={shopSlug ? `/shop/${shopSlug}` : '#'}
        className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: b.primaryColor }}
      >Shop Now</a>
    </nav>
  )
}
function RenderHero({ b, compact, shopSlug }: { b: HeroBlock; compact?: boolean; shopSlug?: string }) {
  return (
    <section id="hero" className="relative overflow-hidden" style={{ minHeight: compact ? 400 : 520 }}>
      <img src={b.bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <div className="absolute inset-0" style={{ backgroundColor: b.overlayColor, opacity: b.overlayOpacity / 100 }} />
      <div className={`relative z-10 flex flex-col justify-center px-5 py-14 md:px-10 md:py-24 ${b.align === 'center' ? 'items-center text-center' : b.align === 'right' ? 'items-end text-right' : 'items-start'}`}>
        {b.badge && <span className="mb-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest" style={{ borderColor: `${b.primaryColor}60`, color: b.primaryColor }}>{b.badge}</span>}
        <h1 className={`max-w-3xl font-black leading-tight text-white ${compact ? 'text-3xl' : 'text-3xl md:text-5xl lg:text-6xl'}`}>{b.tagline}</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">{b.description}</p>
        <div className={`mt-6 flex flex-wrap gap-3 ${b.align === 'center' ? 'justify-center' : b.align === 'right' ? 'justify-end' : ''}`}>
          <a href={shopSlug ? `/shop/${shopSlug}` : '#'} className="rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90" style={{ backgroundColor: b.primaryColor }}>{b.btnPrimary}</a>
          <button type="button" className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white/80">{b.btnSecondary}</button>
        </div>
      </div>
    </section>
  )
}
function RenderStats({ b, compact }: { b: StatsBlock; compact?: boolean }) {
  const cols = compact
    ? 'grid-cols-2'
    : b.items.length <= 2 ? 'grid-cols-2' : b.items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
  return (
    <section id="stats" className="px-5 py-10 md:px-10 md:py-14" style={{ backgroundColor: b.bg }}>
      <div className={`mx-auto max-w-4xl grid gap-6 md:gap-10 ${cols}`}>
        {b.items.map((s, i) => (
          <div key={i} className="text-center">
            <p className="text-4xl font-black" style={{ color: b.valueColor }}>{s.value}</p>
            <p className="mt-2 text-sm" style={{ color: b.labelColor }}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
function RenderFeatures({ b, compact }: { b: FeaturesBlock; compact?: boolean }) {
  const gridCols = compact ? 'grid-cols-1' : b.columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
  return (
    <section id="features" className="px-5 py-12 md:px-10 md:py-16" style={{ backgroundColor: b.bg }}>
      <div className="mx-auto max-w-6xl">
        {(b.title || b.subtitle) && (
          <div className="mb-8 text-center md:mb-12">
            {b.title && <h2 className="text-2xl font-bold md:text-3xl" style={{ color: b.textColor }}>{b.title}</h2>}
            {b.subtitle && <p className="mt-2 text-sm opacity-60" style={{ color: b.textColor }}>{b.subtitle}</p>}
          </div>
        )}
        <div className={`grid gap-4 md:gap-6 ${gridCols}`}>
          {b.items.map((item, i) => (
            <div key={i} className="rounded-2xl border border-black/5 p-6 shadow-sm" style={{ backgroundColor: b.cardBg }}>
              <div className="mb-4 text-3xl">{item.icon}</div>
              <h3 className="mb-2 font-semibold" style={{ color: b.textColor }}>{item.title}</h3>
              <p className="text-sm leading-relaxed opacity-60" style={{ color: b.textColor }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
function RenderText({ b, compact }: { b: TextBlock; compact?: boolean }) {
  return (
    <section className={`${compact ? 'px-5 py-10' : 'px-5 py-12 md:px-10 md:py-16'}`} style={{ backgroundColor: b.bg }}>
      <div className={`mx-auto max-w-3xl ${b.align === 'center' ? 'text-center' : b.align === 'right' ? 'text-right' : ''}`}>
        {b.title && <h2 className="text-2xl font-bold md:text-3xl" style={{ color: b.textColor }}>{b.title}</h2>}
        {b.body && <p className="mt-4 text-sm leading-relaxed opacity-70 md:text-base" style={{ color: b.textColor }}>{b.body}</p>}
      </div>
    </section>
  )
}
function RenderTestimonial({ b, compact }: { b: TestimonialBlock; compact?: boolean }) {
  return (
    <section className={`${compact ? 'px-4 py-10' : 'px-4 py-12 md:px-10 md:py-16'}`}>
      <div className="mx-auto max-w-3xl rounded-2xl p-6 text-center md:rounded-3xl md:p-10" style={{ backgroundColor: b.bg }}>
        <p className="text-lg font-bold leading-relaxed md:text-2xl" style={{ color: b.textColor }}>"{b.text}"</p>
        <p className="mt-4 text-sm font-semibold opacity-70" style={{ color: b.textColor }}>— {b.author}</p>
      </div>
    </section>
  )
}
function RenderCta({ b, compact }: { b: CtaBlock; compact?: boolean }) {
  return (
    <section id="cta" className={`text-center ${compact ? 'px-5 py-14' : 'px-5 py-16 md:px-10 md:py-24'}`} style={{ backgroundColor: b.bg }}>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-black md:text-4xl" style={{ color: b.textColor }}>{b.title}</h2>
        <p className="mt-3 text-sm opacity-60 md:mt-4 md:text-base" style={{ color: b.textColor }}>{b.subtitle}</p>
        <button type="button" className="mt-8 rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-xl md:mt-10 md:px-12 md:py-4" style={{ backgroundColor: b.btnColor }}>{b.btnText}</button>
      </div>
    </section>
  )
}
function RenderAbout({ b, compact }: { b: AboutBlock; compact?: boolean }) {
  return (
    <section id="about" className={`${compact ? 'px-5 py-12' : 'px-5 py-14 md:px-10 md:py-20'}`} style={{ backgroundColor: b.bg }}>
      <div className="mx-auto max-w-6xl">
        <div className={`grid items-center gap-10 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-16'}`}>
          {/* Image */}
          {b.image && (
            <div className="overflow-hidden rounded-3xl shadow-xl">
              <img src={b.image} alt="About" className="h-72 w-full object-cover md:h-96"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
          {/* Content */}
          <div>
            {b.subheading && (
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: b.accentColor }}>{b.subheading}</p>
            )}
            <h2 className={`font-black leading-tight ${compact ? 'text-3xl' : 'text-3xl md:text-4xl'}`} style={{ color: b.textColor }}>
              {b.heading}
            </h2>
            {b.story && (
              <p className="mt-4 text-sm leading-relaxed opacity-70 md:text-base" style={{ color: b.textColor }}>{b.story}</p>
            )}
            {b.highlights.length > 0 && (
              <ul className="mt-6 space-y-3">
                {b.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl">{h.icon}</span>
                    <span className="text-sm leading-relaxed" style={{ color: b.textColor, opacity: 0.75 }}>{h.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
function RenderImage({ b }: { b: ImageBlock }) {
  return (
    <div className={b.fullWidth ? 'w-full' : 'px-10 py-8'}>
      {b.src
        ? <img src={b.src} alt={b.alt} className={`w-full object-cover ${b.fullWidth ? 'max-h-96' : 'rounded-2xl shadow-lg'}`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        : <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-100"><ImageIcon className="h-10 w-10 text-slate-300" /></div>
      }
      {b.caption && <p className="mt-2 text-center text-xs text-slate-400">{b.caption}</p>}
    </div>
  )
}
function RenderFooter({ b, compact }: { b: FooterBlock; compact?: boolean }) {
  return (
    <footer style={{ backgroundColor: b.bg, borderTop: `1px solid ${b.textColor}15`, color: b.textColor }}>
      {/* Main footer content */}
      <div className={`mx-auto max-w-6xl grid grid-cols-1 gap-8 py-10 ${compact ? 'px-5' : 'px-5 md:px-10 md:py-14 md:grid-cols-3 md:gap-10'}`}>
        {/* Brand */}
        <div>
          <p className="text-xl font-black tracking-tight">{b.storeName}</p>
          {b.tagline && <p className="mt-2 text-sm leading-relaxed" style={{ opacity: 0.55 }}>{b.tagline}</p>}
        </div>
        {/* Quick links */}
        {b.links.length > 0 && (
          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest" style={{ opacity: 0.4 }}>Quick Links</p>
            <ul className="space-y-2">
              {b.links.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm transition hover:opacity-100" style={{ opacity: 0.55 }}
                    onClick={(e) => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' }) }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Contact */}
        {(b.email || b.phone || b.address) && (
          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest" style={{ opacity: 0.4 }}>Contact</p>
            <div className="space-y-2">
              {b.email   && <p className="text-sm" style={{ opacity: 0.55 }}>{b.email}</p>}
              {b.phone   && <p className="text-sm" style={{ opacity: 0.55 }}>{b.phone}</p>}
              {b.address && <p className="text-sm" style={{ opacity: 0.55 }}>{b.address}</p>}
            </div>
          </div>
        )}
      </div>
      {/* Copyright bar */}
      <div className="border-t px-5 py-4 text-center text-xs" style={{ borderColor: `${b.textColor}15`, opacity: 0.4 }}>
        © {new Date().getFullYear()} {b.storeName} · {b.copyrightText}
      </div>
    </footer>
  )
}
function BlockCanvas({ block, compact, shopSlug }: { block: Block; compact?: boolean; shopSlug?: string }) {
  switch (block.type) {
    case 'nav': return <RenderNav b={block} compact={compact} shopSlug={shopSlug} />
    case 'hero': return <RenderHero b={block} compact={compact} shopSlug={shopSlug} />
    case 'stats': return <RenderStats b={block} compact={compact} />
    case 'features': return <RenderFeatures b={block} compact={compact} />
    case 'text': return <RenderText b={block} compact={compact} />
    case 'testimonial': return <RenderTestimonial b={block} compact={compact} />
    case 'cta': return <RenderCta b={block} compact={compact} />
    case 'image': return <RenderImage b={block} />
    case 'about': return <RenderAbout b={block} compact={compact} />
    case 'footer': return <RenderFooter b={block} compact={compact} />
  }
}

/* ─────────────────────────────────────────────────────────────
   Block meta
───────────────────────────────────────────────────────────── */
const BLOCK_LABEL: Record<Block['type'], string> = { nav: 'Navigation', hero: 'Hero', stats: 'Stats Row', features: 'Features Grid', text: 'Text Section', testimonial: 'Testimonial', cta: 'CTA Banner', image: 'Image', about: 'About Us', footer: 'Footer' }
const BLOCK_META = [
  { type: 'nav' as const,         label: 'Navigation',    icon: Layout,     mk: () => mkNav() },
  { type: 'hero' as const,        label: 'Hero',          icon: Layout,     mk: () => mkHero() },
  { type: 'about' as const,       label: 'About Us',      icon: Type,       mk: () => mkAbout() },
  { type: 'stats' as const,       label: 'Stats',         icon: TrendingUp, mk: () => mkStats() },
  { type: 'features' as const,    label: 'Features Grid', icon: LayoutGrid, mk: () => mkFeatures() },
  { type: 'text' as const,        label: 'Text Section',  icon: Type,       mk: () => mkText() },
  { type: 'testimonial' as const, label: 'Testimonial',   icon: Type,       mk: () => mkTestimonial() },
  { type: 'cta' as const,         label: 'CTA Banner',    icon: Zap,        mk: () => mkCta() },
  { type: 'image' as const,       label: 'Image',         icon: ImageIcon,  mk: () => mkImage() },
  { type: 'footer' as const,      label: 'Footer',        icon: Layout,     mk: () => mkFooter() },
]

/* ─────────────────────────────────────────────────────────────
   Form helpers
───────────────────────────────────────────────────────────── */
const iCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
const lCls = 'text-[10px] font-semibold uppercase tracking-wider text-slate-400'

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><p className={lCls}>{label}</p>{children}</div>
}
function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setUploading(true)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'partner-storefronts')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const json = await res.json() as { url?: string; error?: string }
      if (json.url) {
        onChange(json.url)
      } else {
        showErrorToast(json.error ?? 'Upload failed.')
      }
    } catch {
      showErrorToast('Upload failed.')
    } finally {
      setUploading(false)
      setLocalPreview(null)
      URL.revokeObjectURL(objectUrl)
      e.target.value = ''
    }
  }

  const thumbSrc = localPreview ?? value

  return (
    <F label={label}>
      <div className="flex gap-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value)} className={`${iCls} min-w-0 flex-1`} placeholder="https://…" />
        <label className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-800 ${uploading ? 'pointer-events-none opacity-50' : ''}`} title="Upload image">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {thumbSrc && (
        <div className="relative mt-1.5">
          <img src={thumbSrc} alt="" className="h-20 w-full rounded-lg object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
      )}
    </F>
  )
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <F label={label}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 cursor-pointer rounded-lg border-0" />
        <span className="font-mono text-xs text-slate-500">{value}</span>
      </div>
    </F>
  )
}
function RangeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <F label={`${label}: ${value}%`}>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-indigo-500" />
    </F>
  )
}
function AlignPicker({ value, onChange }: { value: 'left' | 'center' | 'right'; onChange: (v: 'left' | 'center' | 'right') => void }) {
  return (
    <F label="Alignment">
      <div className="flex gap-2">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button key={a} type="button" onClick={() => onChange(a)}
            className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold capitalize transition ${value === a ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            {a}
          </button>
        ))}
      </div>
    </F>
  )
}

/* ─────────────────────────────────────────────────────────────
   Properties panels
───────────────────────────────────────────────────────────── */
function NavProps({ b, onChange }: { b: NavBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof NavBlock>(k: K, v: NavBlock[K]) => onChange({ ...b, [k]: v })
  const links = b.links ?? DEFAULT_NAV_LINKS
  const updateLink = (i: number, key: keyof NavLink, v: string) =>
    set('links', links.map((l, idx) => idx === i ? { ...l, [key]: v } : l))
  return (
    <div className="space-y-3">
      <ImageField label="Logo Image URL" value={b.logo} onChange={(v) => set('logo', v)} />
      <F label="Store Name"><input value={b.storeName} onChange={(e) => set('storeName', e.target.value)} className={iCls} /></F>
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Text Color" value={b.textColor} onChange={(v) => set('textColor', v)} />
      <ColorField label="Button Color" value={b.primaryColor} onChange={(v) => set('primaryColor', v)} />
      <div className="space-y-2">
        <p className={lCls}>Nav Links <span className="normal-case font-normal text-slate-400">(href = #section-id)</span></p>
        {links.map((link, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Link {i + 1}</span>
              <button type="button" onClick={() => set('links', links.filter((_, idx) => idx !== i))}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400">
                <Trash2 className="h-2.5 w-2.5" /> Remove
              </button>
            </div>
            <div className="flex gap-1.5">
              <input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Label" />
              <input value={link.href} onChange={(e) => updateLink(i, 'href', e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="#section" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set('links', [...links, { label: 'New Link', href: '#section' }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
          <Plus className="h-3 w-3" /> Add link
        </button>
      </div>
    </div>
  )
}
function HeroProps({ b, onChange }: { b: HeroBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof HeroBlock>(k: K, v: HeroBlock[K]) => onChange({ ...b, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Badge Text"><input value={b.badge} onChange={(e) => set('badge', e.target.value)} className={iCls} /></F>
      <F label="Headline"><input value={b.tagline} onChange={(e) => set('tagline', e.target.value)} className={iCls} /></F>
      <F label="Description"><textarea value={b.description} onChange={(e) => set('description', e.target.value)} rows={3} className={iCls} /></F>
      <ImageField label="Background Image URL" value={b.bgImage} onChange={(v) => set('bgImage', v)} />
      <ColorField label="Overlay Color" value={b.overlayColor} onChange={(v) => set('overlayColor', v)} />
      <RangeRow label="Overlay Opacity" value={b.overlayOpacity} onChange={(v) => set('overlayOpacity', v)} />
      <ColorField label="Button Color" value={b.primaryColor} onChange={(v) => set('primaryColor', v)} />
      <AlignPicker value={b.align} onChange={(v) => onChange({ ...b, align: v })} />
      <F label="Primary Button"><input value={b.btnPrimary} onChange={(e) => set('btnPrimary', e.target.value)} className={iCls} /></F>
      <F label="Secondary Button"><input value={b.btnSecondary} onChange={(e) => set('btnSecondary', e.target.value)} className={iCls} /></F>
      {(b.badge1 !== undefined || b.badge2 !== undefined || b.badge3 !== undefined) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2 dark:border-slate-700 dark:bg-slate-800">
          <p className={lCls}>Trust Badges</p>
          <F label="Badge 1"><input value={b.badge1 ?? ''} onChange={(e) => set('badge1', e.target.value)} className={iCls} /></F>
          <F label="Badge 2"><input value={b.badge2 ?? ''} onChange={(e) => set('badge2', e.target.value)} className={iCls} /></F>
          <F label="Badge 3"><input value={b.badge3 ?? ''} onChange={(e) => set('badge3', e.target.value)} className={iCls} /></F>
        </div>
      )}
    </div>
  )
}
function StatsProps({ b, onChange }: { b: StatsBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof StatsBlock>(k: K, v: StatsBlock[K]) => onChange({ ...b, [k]: v })
  const updateItem = (i: number, key: 'value' | 'label', v: string) => set('items', b.items.map((it, idx) => idx === i ? { ...it, [key]: v } : it))
  return (
    <div className="space-y-3">
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Value Color" value={b.valueColor} onChange={(v) => set('valueColor', v)} />
      <ColorField label="Label Color" value={b.labelColor} onChange={(v) => set('labelColor', v)} />
      <div className="space-y-2">
        <p className={lCls}>Stats</p>
        {b.items.map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Stat {i + 1}</span>
              <button
                type="button"
                onClick={() => set('items', b.items.filter((_, idx) => idx !== i))}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400"
              >
                <Trash2 className="h-2.5 w-2.5" /> Remove
              </button>
            </div>
            <div className="flex gap-1.5">
              <input value={item.value} onChange={(e) => updateItem(i, 'value', e.target.value)}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="500+" />
              <input value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Label" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set('items', [...b.items, { value: '0', label: 'New Stat' }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
          <Plus className="h-3 w-3" /> Add stat
        </button>
      </div>
    </div>
  )
}
function FeaturesProps({ b, onChange }: { b: FeaturesBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof FeaturesBlock>(k: K, v: FeaturesBlock[K]) => onChange({ ...b, [k]: v })
  const updateItem = (i: number, key: keyof FeatureItem, v: string) => set('items', b.items.map((it, idx) => idx === i ? { ...it, [key]: v } : it))
  return (
    <div className="space-y-3">
      <F label="Section Title"><input value={b.title} onChange={(e) => set('title', e.target.value)} className={iCls} /></F>
      <F label="Subtitle"><input value={b.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={iCls} /></F>
      <F label="Columns">
        <div className="flex gap-2">
          {([2, 3] as const).map((c) => (
            <button key={c} type="button" onClick={() => set('columns', c)}
              className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold transition ${b.columns === c ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500'}`}>
              {c} cols
            </button>
          ))}
        </div>
      </F>
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Card Background" value={b.cardBg} onChange={(v) => set('cardBg', v)} />
      <ColorField label="Text Color" value={b.textColor} onChange={(v) => set('textColor', v)} />
      <ColorField label="Accent Color" value={b.accentColor} onChange={(v) => set('accentColor', v)} />
      <div className="space-y-2">
        <p className={lCls}>Feature Items</p>
        {b.items.map((item, i) => (
          <div key={i} className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Feature {i + 1}</span>
              <button type="button" onClick={() => set('items', b.items.filter((_, idx) => idx !== i))}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400">
                <Trash2 className="h-2.5 w-2.5" /> Remove
              </button>
            </div>
            <div className="flex gap-1.5">
              <input value={item.icon} onChange={(e) => updateItem(i, 'icon', e.target.value)}
                className="w-12 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="🎯" />
              <input value={item.title} onChange={(e) => updateItem(i, 'title', e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Title" />
            </div>
            <input value={item.desc} onChange={(e) => updateItem(i, 'desc', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Description" />
          </div>
        ))}
        <button type="button" onClick={() => set('items', [...b.items, { icon: '✨', title: 'New Feature', desc: 'Feature description.' }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
          <Plus className="h-3 w-3" /> Add item
        </button>
      </div>
    </div>
  )
}
function TextProps({ b, onChange }: { b: TextBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof TextBlock>(k: K, v: TextBlock[K]) => onChange({ ...b, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Title"><input value={b.title} onChange={(e) => set('title', e.target.value)} className={iCls} /></F>
      <F label="Body"><textarea value={b.body} onChange={(e) => set('body', e.target.value)} rows={4} className={iCls} /></F>
      <AlignPicker value={b.align} onChange={(v) => onChange({ ...b, align: v })} />
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Text Color" value={b.textColor} onChange={(v) => set('textColor', v)} />
    </div>
  )
}
function TestimonialProps({ b, onChange }: { b: TestimonialBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof TestimonialBlock>(k: K, v: TestimonialBlock[K]) => onChange({ ...b, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Quote"><textarea value={b.text} onChange={(e) => set('text', e.target.value)} rows={4} className={iCls} /></F>
      <F label="Author"><input value={b.author} onChange={(e) => set('author', e.target.value)} className={iCls} /></F>
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Text Color" value={b.textColor} onChange={(v) => set('textColor', v)} />
    </div>
  )
}
function CtaProps({ b, onChange }: { b: CtaBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof CtaBlock>(k: K, v: CtaBlock[K]) => onChange({ ...b, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Headline"><input value={b.title} onChange={(e) => set('title', e.target.value)} className={iCls} /></F>
      <F label="Subheading"><textarea value={b.subtitle} onChange={(e) => set('subtitle', e.target.value)} rows={2} className={iCls} /></F>
      <F label="Button Text"><input value={b.btnText} onChange={(e) => set('btnText', e.target.value)} className={iCls} /></F>
      <ColorField label="Button Color" value={b.btnColor} onChange={(v) => set('btnColor', v)} />
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Text Color" value={b.textColor} onChange={(v) => set('textColor', v)} />
    </div>
  )
}
function ImageProps({ b, onChange }: { b: ImageBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof ImageBlock>(k: K, v: ImageBlock[K]) => onChange({ ...b, [k]: v })
  return (
    <div className="space-y-3">
      <ImageField label="Image URL" value={b.src} onChange={(v) => set('src', v)} />
      <F label="Alt Text"><input value={b.alt} onChange={(e) => set('alt', e.target.value)} className={iCls} /></F>
      <F label="Caption"><input value={b.caption} onChange={(e) => set('caption', e.target.value)} className={iCls} /></F>
      <F label="Width">
        <div className="flex gap-2">
          {[{ v: true, l: 'Full Width' }, { v: false, l: 'Contained' }].map(({ v, l }) => (
            <button key={l} type="button" onClick={() => set('fullWidth', v)}
              className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold transition ${b.fullWidth === v ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </F>
    </div>
  )
}
function AboutProps({ b, onChange }: { b: AboutBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof AboutBlock>(k: K, v: AboutBlock[K]) => onChange({ ...b, [k]: v })
  const updateHighlight = (i: number, key: keyof AboutHighlight, v: string) =>
    set('highlights', b.highlights.map((h, idx) => idx === i ? { ...h, [key]: v } : h))
  return (
    <div className="space-y-3">
      <F label="Section Heading"><input value={b.heading} onChange={(e) => set('heading', e.target.value)} className={iCls} placeholder="About Us" /></F>
      <F label="Subheading"><input value={b.subheading} onChange={(e) => set('subheading', e.target.value)} className={iCls} placeholder="Who we are…" /></F>
      <F label="Our Story">
        <textarea value={b.story} onChange={(e) => set('story', e.target.value)} rows={5} className={iCls} placeholder="Tell your company story…" />
      </F>
      <ImageField label="Photo URL" value={b.image} onChange={(v) => set('image', v)} />
      <div className="space-y-2">
        <p className={lCls}>Highlights</p>
        {b.highlights.map((h, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Point {i + 1}</span>
              <button type="button" onClick={() => set('highlights', b.highlights.filter((_, idx) => idx !== i))}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400">
                <Trash2 className="h-2.5 w-2.5" /> Remove
              </button>
            </div>
            <div className="flex gap-1.5">
              <input value={h.icon} onChange={(e) => updateHighlight(i, 'icon', e.target.value)}
                className="w-12 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="🏠" />
              <input value={h.text} onChange={(e) => updateHighlight(i, 'text', e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Key highlight…" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set('highlights', [...b.highlights, { icon: '⭐', text: 'New highlight' }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
          <Plus className="h-3 w-3" /> Add highlight
        </button>
      </div>
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Text Color" value={b.textColor} onChange={(v) => set('textColor', v)} />
      <ColorField label="Accent Color" value={b.accentColor} onChange={(v) => set('accentColor', v)} />
    </div>
  )
}
function FooterProps({ b, onChange }: { b: FooterBlock; onChange: (b: Block) => void }) {
  const set = <K extends keyof FooterBlock>(k: K, v: FooterBlock[K]) => onChange({ ...b, [k]: v })
  const updateLink = (i: number, key: keyof FooterLink, v: string) =>
    set('links', b.links.map((l, idx) => idx === i ? { ...l, [key]: v } : l))
  return (
    <div className="space-y-3">

      {/* Brand */}
      <F label="Store Name"><input value={b.storeName} onChange={(e) => set('storeName', e.target.value)} className={iCls} /></F>
      <F label="Tagline"><input value={b.tagline} onChange={(e) => set('tagline', e.target.value)} className={iCls} placeholder="Your trusted furniture partner." /></F>
      <F label="Copyright Text"><input value={b.copyrightText} onChange={(e) => set('copyrightText', e.target.value)} className={iCls} placeholder="Powered by Apsara Home" /></F>

      {/* Contact */}
      <F label="Email"><input value={b.email} onChange={(e) => set('email', e.target.value)} className={iCls} placeholder="hello@yourstore.com" /></F>
      <F label="Phone"><input value={b.phone} onChange={(e) => set('phone', e.target.value)} className={iCls} placeholder="+63 912 345 6789" /></F>
      <F label="Address"><input value={b.address ?? ''} onChange={(e) => set('address', e.target.value)} className={iCls} placeholder="123 Main St, City, Country" /></F>

      {/* Quick Links */}
      <div className="space-y-2">
        <p className={lCls}>Quick Links</p>
        {b.links.map((link, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Link {i + 1}</span>
              <button
                type="button"
                onClick={() => set('links', b.links.filter((_, idx) => idx !== i))}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400"
              >
                <Trash2 className="h-2.5 w-2.5" /> Remove
              </button>
            </div>
            <div className="flex gap-1.5">
              <input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Label" />
              <input value={link.href} onChange={(e) => updateLink(i, 'href', e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="#section" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set('links', [...b.links, { label: 'New Link', href: '#section' }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
          <Plus className="h-3 w-3" /> Add link
        </button>
      </div>

      {/* Colors */}
      <ColorField label="Background" value={b.bg} onChange={(v) => set('bg', v)} />
      <ColorField label="Text Color" value={b.textColor} onChange={(v) => set('textColor', v)} />
    </div>
  )
}
function PropertiesPanel({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">{BLOCK_LABEL[block.type]}</span>
      </div>
      {block.type === 'nav' && <NavProps b={block} onChange={onChange} />}
      {block.type === 'hero' && <HeroProps b={block} onChange={onChange} />}
      {block.type === 'stats' && <StatsProps b={block} onChange={onChange} />}
      {block.type === 'features' && <FeaturesProps b={block} onChange={onChange} />}
      {block.type === 'text' && <TextProps b={block} onChange={onChange} />}
      {block.type === 'testimonial' && <TestimonialProps b={block} onChange={onChange} />}
      {block.type === 'cta' && <CtaProps b={block} onChange={onChange} />}
      {block.type === 'image' && <ImageProps b={block} onChange={onChange} />}
      {block.type === 'about' && <AboutProps b={block} onChange={onChange} />}
      {block.type === 'footer' && <FooterProps b={block} onChange={onChange} />}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Add-block panel
───────────────────────────────────────────────────────────── */
function AddBlockPanel({ onAdd }: { onAdd: (b: Block) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400">Click to insert below the selected block.</p>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_META.map(({ type, label, icon: Icon, mk }) => (
          <button key={type} type="button" onClick={() => onAdd(mk())}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Template4 — map block data to Template4 props so the live
   component reflects edits made through the block panel
───────────────────────────────────────────────────────────── */
function mapBlocksToT4Props(blocks: Block[]) {
  const nav      = blocks.find((b) => b.type === 'nav')      as NavBlock | undefined
  const hero     = blocks.find((b) => b.type === 'hero')     as HeroBlock | undefined
  const about    = blocks.find((b) => b.type === 'about')    as AboutBlock | undefined
  const statsBlk = blocks.find((b) => b.type === 'stats')    as StatsBlock | undefined
  const feat     = blocks.find((b) => b.type === 'features') as FeaturesBlock | undefined
  const cta      = blocks.find((b) => b.type === 'cta')      as CtaBlock | undefined
  const footer   = blocks.find((b) => b.type === 'footer')   as FooterBlock | undefined
  const items    = statsBlk?.items ?? []
  return {
    storeName:        nav?.storeName,
    primaryColor:     nav?.primaryColor,
    navLogo:          nav?.logo,
    navLinks:         nav?.links,
    tagline:          hero?.tagline,
    description:      hero?.description,
    heroImage:        hero?.bgImage,
    heroAlign:        hero?.align,
    heroBtnPrimary:   hero?.btnPrimary,
    heroBtnSecondary: hero?.btnSecondary,
    heroBadge1:       hero?.badge1,
    heroBadge2:       hero?.badge2,
    heroBadge3:       hero?.badge3,
    aboutTitle:       about?.heading,
    aboutBody:        about?.story,
    aboutImage:       about?.image,
    aboutHighlights:  about?.highlights,
    featuresTitle:    feat?.title,
    featuresSubtitle: feat?.subtitle,
    ctaTitle:         cta?.title,
    ctaSubtitle:      cta?.subtitle,
    ctaBtnText:       cta?.btnText,
    ctaEmail:         footer?.email,
    ctaPhone:         footer?.phone,
    ctaAddress:       footer?.address,
    socialFacebook:   footer?.socialFacebook,
    socialInstagram:  footer?.socialInstagram,
    socialX:          footer?.socialX,
    stat1Value: items[0]?.value, stat1Label: items[0]?.label,
    stat2Value: items[1]?.value, stat2Label: items[1]?.label,
    stat3Value: items[2]?.value, stat3Label: items[2]?.label,
    stat4Value: items[3]?.value, stat4Label: items[3]?.label,
    stat5Value: items[4]?.value, stat5Label: items[4]?.label,
  }
}

/* ─────────────────────────────────────────────────────────────
   Template picker thumbnails
───────────────────────────────────────────────────────────── */
const TEMPLATE_META = [
  { id: 'template1', name: 'Modern Dark',   tag: 'Dark & Immersive', desc: 'Dark hero, amber stats, indigo features.' },
  { id: 'template2', name: 'Light & Clean', tag: 'Warm & Minimal',   desc: 'White cards, orange accents, testimonial.' },
  { id: 'template3', name: 'Bold Gradient', tag: 'Purple Gradient',  desc: 'Deep purple gradient with glass cards.' },
  { id: 'template4', name: 'SaaS Business', tag: 'Clean & Modern',   desc: 'Split hero with dashboard mockup, blue accent, light layout.' },
]
/* ─────────────────────────────────────────────────────────────
   Color themes
───────────────────────────────────────────────────────────── */
const COLOR_THEMES = [
  { name: 'Indigo',   color: '#6366f1' },
  { name: 'Violet',   color: '#7c3aed' },
  { name: 'Orange',   color: '#f97316' },
  { name: 'Emerald',  color: '#10b981' },
  { name: 'Rose',     color: '#f43f5e' },
  { name: 'Sky',      color: '#0ea5e9' },
  { name: 'Amber',    color: '#f59e0b' },
  { name: 'Pink',     color: '#ec4899' },
  { name: 'Teal',     color: '#14b8a6' },
  { name: 'Red',      color: '#ef4444' },
  { name: 'Lime',     color: '#84cc16' },
  { name: 'Cyan',     color: '#06b6d4' },
]

function applyColorTheme(blocks: Block[], color: string): Block[] {
  return blocks.map((block) => {
    switch (block.type) {
      case 'nav':         return { ...block, primaryColor: color }
      case 'hero':        return { ...block, primaryColor: color }
      case 'stats':       return { ...block, valueColor: color }
      case 'features':    return { ...block, accentColor: color }
      case 'cta':         return { ...block, btnColor: color }
      case 'testimonial': return { ...block, bg: color }
      default:            return block
    }
  })
}

function TemplateThumbnail({ blocks }: { blocks: Block[] }) {
  return (
    <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: '1280px', transform: 'scale(0.305)', transformOrigin: 'top left' }}>
      {blocks.map((b) => <BlockCanvas key={b.id} block={b} />)}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────── */
export default function LandingPageStudio() {
  const router = useRouter()
  const { data, isLoading } = useGetAdminWebPageItemsQuery({ type: 'partner_storefront' } as never)
  const [updateItem, { isLoading: isSaving }] = useUpdateAdminWebPageItemMutation()
  const { data: me, isLoading: isMeLoading } = useGetAdminMeQuery()

  const items = (data as { items?: WebPageItem[] } | undefined)?.items ?? []
  const slug = getPartnerStorefrontConfig(items[0])?.slug ?? ''
  const canAccess = slug === 'jujutsu-kaisen' || me?.username === 'try'

  useEffect(() => {
    if (!isLoading && !isMeLoading && !canAccess) {
      router.replace('/partner')
    }
  }, [isLoading, isMeLoading, canAccess, router])

  const [item, setItem]           = useState<WebPageItem | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [blocks, setBlocks]       = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rightTab, setRightTab]   = useState<'add' | 'props' | 'theme'>('add')
  const [mobile, setMobile]       = useState(false)
  const [editing, setEditing]     = useState(false)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const [carouselDir, setCarouselDir] = useState(1)
  const dragRef = { from: -1, to: -1 }

  useEffect(() => {
    const items = (data as { items?: WebPageItem[] } | undefined)?.items ?? []
    const first = items[0]
    if (!first) return
    setItem(first)
    const fields = ((first.payload as { fields?: Record<string, string> } | null)?.fields) ?? {}
    const tid = fields.landing_template_id as string | undefined
    if (tid && TEMPLATE_DEFAULTS[tid]) {
      setTemplateId(tid)
      try {
        const saved = JSON.parse(fields.page_blocks ?? '[]') as Block[]
        if (saved.length === 0) {
          setBlocks(TEMPLATE_DEFAULTS[tid]())
        } else if (!saved.some((b) => b.type === 'about')) {
          // Migrate: inject About block after the Hero (or after index 1)
          const heroIdx = saved.findIndex((b) => b.type === 'hero')
          const insertAt = heroIdx >= 0 ? heroIdx + 1 : Math.min(2, saved.length)
          const next = [...saved]
          next.splice(insertAt, 0, mkAbout())
          setBlocks(next)
        } else {
          setBlocks(saved)
        }
      } catch {
        setBlocks(TEMPLATE_DEFAULTS[tid]())
      }
    }
  }, [data])

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null
  const shopSlug = getPartnerStorefrontConfig(item ?? undefined)?.slug ?? ''

  const addBlock = (b: Block) => {
    const idx = blocks.findIndex((bl) => bl.id === selectedId)
    const next = [...blocks]
    next.splice(idx === -1 ? next.length : idx + 1, 0, b)
    setBlocks(next)
    setSelectedId(b.id)
    setRightTab('props')
  }
  const updateBlock = (updated: Block) => setBlocks((prev) => prev.map((b) => b.id === updated.id ? updated : b))
  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedId === id) { setSelectedId(null); setRightTab('add') }
  }
  const moveBlock = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id)
    if (i < 0) return
    const next = [...blocks]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setBlocks(next)
  }

  const handleSave = async () => {
    if (!item || !templateId) return
    const config = getPartnerStorefrontConfig(item)
    const existingFields = ((item.payload as { fields?: Record<string, string> } | null)?.fields) ?? {}
    try {
      await updateItem({
        type: 'partner-storefront',
        id: item.id,
        data: {
          payload: {
            fields: {
              ...existingFields,
              landing_template_id: templateId,
              page_blocks: JSON.stringify(blocks),
              slug: config?.slug ?? existingFields.slug ?? '',
              display_name: config?.displayName ?? existingFields.display_name ?? '',
            },
          },
        },
      }).unwrap()
      showSuccessToast('Landing page saved.')
    } catch {
      showErrorToast('Failed to save. Please try again.')
    }
  }

  if (isLoading || isMeLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
  if (!canAccess) return null

  /* ── Template picker ─────────────────────────────────────── */
  if (!editing || !templateId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Landing Page Builder</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a starting template. You can add, remove, and edit every section after.</p>
        </div>

        {templateId && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 dark:border-emerald-800/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">{TEMPLATE_META.find((t) => t.id === templateId)?.name}</span> is your active template.
            </p>
            <button type="button" onClick={() => setEditing(true)}
              className="ml-auto rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700">
              Edit Page →
            </button>
          </div>
        )}

        {/* Carousel — infinite loop, center focused, sides blurred */}
        {(() => {
          const total = TEMPLATE_META.length
          const wrap = (i: number) => ((i % total) + total) % total
          const slots = [-1, 0, 1]

          const slideVariants = {
            enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 1 }),
            center: { x: 0, opacity: 1 },
            exit:  (dir: number) => ({
              x: dir > 0 ? '-40%' : '40%',
              opacity: 0,
              transition: { duration: 0.22, ease: 'easeIn' },
            }),
          }

          const renderCard = (tpl: typeof TEMPLATE_META[number], isCenter: boolean, offset: number) => {
            const isActive = templateId === tpl.id
            const thumbBlocks = isActive ? blocks : TEMPLATE_DEFAULTS[tpl.id]()
            return (
              <button type="button"
                onClick={() => {
                  if (isCenter) {
                    if (!isActive) { setTemplateId(tpl.id); setBlocks(TEMPLATE_DEFAULTS[tpl.id]()) }
                    setEditing(true)
                  } else {
                    setCarouselDir(offset)
                    setCarouselIdx(TEMPLATE_META.indexOf(tpl))
                  }
                }}
                className={`group w-full flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left dark:bg-slate-900
                  ${isCenter
                    ? `shadow-2xl ${isActive ? 'border-emerald-400' : 'border-indigo-400'}`
                    : `shadow-sm cursor-pointer ${isActive ? 'border-emerald-300' : 'border-slate-200 dark:border-slate-700'}`
                  }`}
              >
                <div className="relative h-52 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {tpl.id === 'template4'
                    ? <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: '1280px', transform: 'scale(0.305)', transformOrigin: 'top left' }}>
                        <Template4Component {...mapBlocksToT4Props(thumbBlocks)} />
                      </div>
                    : <TemplateThumbnail blocks={thumbBlocks} />
                  }
                  {isActive && <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow"><CheckCircle2 className="h-3 w-3" /> Active</div>}
                </div>
                <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{tpl.name}</p>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">{tpl.tag}</span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{tpl.desc}</p>
                  {isCenter && <p className="mt-1 text-[12px] font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">{isActive ? 'Edit this template →' : 'Use this template →'}</p>}
                </div>
              </button>
            )
          }

          return (
            <div className="relative px-2">
              <div className="flex items-stretch gap-4">
                {slots.map((offset) => {
                  const tpl = TEMPLATE_META[wrap(carouselIdx + offset)]
                  const isCenter = offset === 0
                  return (
                    <div
                      className="flex-1 overflow-hidden transition-all duration-300 ease-out"
                      style={{
                        zIndex: isCenter ? 10 : 1,
                        transform: `scale(${isCenter ? 1.04 : 0.94}) translateY(${isCenter ? -4 : 0}px)`,
                        opacity: isCenter ? 1 : 0.55,
                        filter: isCenter ? 'none' : 'blur(2px)',
                      }}
                    >
                      <AnimatePresence initial={false} mode="wait" custom={carouselDir}>
                        <motion.div
                          key={tpl.id}
                          custom={carouselDir}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
                        >
                          {renderCard(tpl, isCenter, offset)}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              {/* Prev arrow */}
              <motion.button type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => { setCarouselDir(-1); setCarouselIdx((i) => wrap(i - 1)) }}
                className="absolute -left-3 top-[calc(50%-32px)] -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>

              {/* Next arrow */}
              <motion.button type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => { setCarouselDir(1); setCarouselIdx((i) => wrap(i + 1)) }}
                className="absolute -right-3 top-[calc(50%-32px)] -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>

              {/* Dot indicators */}
              <div className="mt-5 flex items-center justify-center gap-2">
                {TEMPLATE_META.map((tpl, idx) => (
                  <motion.button
                    key={tpl.id}
                    type="button"
                    onClick={() => { setCarouselDir(idx > carouselIdx ? 1 : -1); setCarouselIdx(idx) }}
                    animate={{
                      width: idx === carouselIdx ? 24 : 8,
                      backgroundColor: idx === carouselIdx ? '#4f46e5' : '#cbd5e1',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="h-2 rounded-full"
                  />
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  /* ── Editor ──────────────────────────────────────────────── */
  const meta = TEMPLATE_META.find((t) => t.id === templateId)
  return (
    <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setEditing(false); setSelectedId(null) }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">{meta?.name} — Landing Page</h1>
            <p className="text-[11px] text-slate-400">Click a section to edit · drag to reorder · add from the right panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMobile(false)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${!mobile ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400 dark:border-slate-700'}`}>
            <Monitor className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setMobile(true)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${mobile ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400 dark:border-slate-700'}`}>
            <Smartphone className="h-4 w-4" />
          </button>
          <button type="button"
            onClick={() => { if (blocks.length === 0 || window.confirm('Remove all blocks?')) { setBlocks([]); setSelectedId(null); setRightTab('add') } }}
            disabled={blocks.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* Builder */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">

        {/* Canvas */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40">
          {/* Browser chrome */}
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 rounded-lg bg-slate-100 px-3 py-1 text-center text-[10px] text-slate-400 dark:bg-slate-800">
              your-store.afhome.ph
            </div>
          </div>
          {/* Page — items-start so content grows to full height and is scrollable */}
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4">
            {templateId === 'template4' ? (
              /* Template4 renders its own complete design with per-section click-to-edit */
              <div className="w-full rounded-xl bg-white shadow-2xl overflow-hidden" style={{ maxWidth: mobile ? 390 : '100%' }}>
                <Template4Component
                  {...mapBlocksToT4Props(blocks)}
                  shopSlug={slug}
                  selectedSection={blocks.find((b) => b.id === selectedId)?.type ?? null}
                  onSectionClick={(section) => {
                    const block = blocks.find((b) => b.type === section)
                    if (block) { setSelectedId(block.id); setRightTab('props') }
                  }}
                />
              </div>
            ) : (
              <div className="w-full rounded-xl bg-white shadow-2xl" style={{ maxWidth: mobile ? 390 : '100%' }}
                onClick={(e) => { if (e.target === e.currentTarget) { setSelectedId(null); setRightTab('add') } }}>
                {blocks.length === 0 && (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                    <LayoutGrid className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No blocks yet. Add one from the right panel.</p>
                  </div>
                )}
                {blocks.map((block, i) => {
                  const isSelected = block.id === selectedId
                  return (
                    <div key={block.id}
                      className={`group relative cursor-pointer outline-none transition-all ${isSelected ? 'ring-2 ring-inset ring-indigo-500' : 'hover:ring-1 hover:ring-inset hover:ring-indigo-300'}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(block.id); setRightTab('props') }}
                      draggable
                      onDragStart={() => { dragRef.from = i }}
                      onDragOver={(e) => { e.preventDefault(); dragRef.to = i }}
                      onDrop={() => {
                        if (dragRef.from === dragRef.to || dragRef.from < 0) return
                        const next = [...blocks]
                        const [moved] = next.splice(dragRef.from, 1)
                        next.splice(dragRef.to, 0, moved)
                        setBlocks(next)
                        dragRef.from = -1; dragRef.to = -1
                      }}
                    >
                      {/* Selected toolbar */}
                      {isSelected && (
                        <div className="absolute left-2 top-2 z-30 flex items-center gap-1 rounded-xl bg-indigo-600 px-2 py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}>
                          <GripVertical className="h-3.5 w-3.5 cursor-grab text-white/70" />
                          <span className="text-[11px] font-semibold text-white">{BLOCK_LABEL[block.type]}</span>
                          <div className="mx-1 h-3 w-px bg-white/25" />
                          <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={i === 0}
                            className="rounded p-0.5 text-white/80 transition hover:bg-white/20 disabled:opacity-30">
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={i === blocks.length - 1}
                            className="rounded p-0.5 text-white/80 transition hover:bg-white/20 disabled:opacity-30">
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => deleteBlock(block.id)}
                            className="rounded p-0.5 text-white/80 transition hover:bg-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {/* Hover label */}
                      {!isSelected && (
                        <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                          {BLOCK_LABEL[block.type]}
                        </div>
                      )}
                      <BlockCanvas block={block} compact={mobile} shopSlug={shopSlug} />
                    </div>
                  )
                })}
                {/* Add block at bottom */}
                <div className="flex items-center justify-center border-t border-dashed border-slate-200 py-4">
                  <button type="button" onClick={() => { setSelectedId(null); setRightTab('add') }}
                    className="flex items-center gap-2 rounded-full border border-dashed border-indigo-300 px-5 py-2 text-xs font-semibold text-indigo-500 transition hover:bg-indigo-50">
                    <Plus className="h-3.5 w-3.5" /> Add Block
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex w-72 shrink-0 flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex shrink-0 gap-0 border-b border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setRightTab('add')}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${rightTab === 'add' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Plus className="h-3 w-3" /> Add
            </button>
            <button type="button" onClick={() => setRightTab('props')} disabled={!selectedBlock}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition disabled:opacity-40 ${rightTab === 'props' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Type className="h-3 w-3" /> Properties
            </button>
            <button type="button" onClick={() => setRightTab('theme')}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${rightTab === 'theme' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Palette className="h-3 w-3" /> Theme
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden">
            {rightTab === 'add' && <AddBlockPanel onAdd={addBlock} />}
            {rightTab === 'props' && selectedBlock && <PropertiesPanel block={selectedBlock} onChange={updateBlock} />}
            {rightTab === 'props' && !selectedBlock && (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                <LayoutGrid className="h-6 w-6 opacity-30" />
                <p className="text-center text-xs">Click a block on the canvas to edit its properties.</p>
              </div>
            )}
            {rightTab === 'theme' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Color Theme</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Applies the chosen color to all blocks at once — buttons, accents, highlights, and stats.</p>
                </div>

                {/* Preset swatches */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Presets</p>
                  <div className="grid grid-cols-6 gap-2">
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.color}
                        type="button"
                        title={theme.name}
                        onClick={() => setBlocks(applyColorTheme(blocks, theme.color))}
                        className="group relative flex h-8 w-8 items-center justify-center rounded-xl border-2 border-transparent transition hover:scale-110 hover:border-white hover:shadow-lg"
                        style={{ backgroundColor: theme.color }}
                      >
                        <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                          {theme.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom color */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Custom Color</p>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="color"
                      defaultValue="#6366f1"
                      onChange={(e) => setBlocks(applyColorTheme(blocks, e.target.value))}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0"
                    />
                    <span className="text-xs text-slate-500">Pick any color</span>
                  </div>
                </div>

                {/* What gets updated */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">What changes</p>
                  <ul className="space-y-1">
                    {[
                      'Nav — Shop Now button',
                      'Hero — badge, CTA buttons',
                      'Stats — value numbers',
                      'Features — accent color',
                      'CTA — button color',
                      'Testimonial — background',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="h-1 w-1 rounded-full bg-indigo-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
