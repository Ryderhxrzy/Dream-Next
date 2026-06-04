'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowUp, ArrowDown, CheckCircle2,
  Eye, ImageIcon, LayoutGrid, Loader2,
  Monitor, Plus, Smartphone, Trash2, Type,
  TrendingUp, Zap, Layout, X, GripVertical,
} from 'lucide-react'
import { showErrorToast, showSuccessToast } from '@/libs/toast'
import { getPartnerStorefrontConfig } from '@/libs/partnerStorefront'
import {
  useGetAdminWebPageItemsQuery,
  useUpdateAdminWebPageItemMutation,
  type WebPageItem,
} from '@/store/api/webPagesApi'

/* ─────────────────────────────────────────────────────────────
   Tiny ID util
───────────────────────────────────────────────────────────── */
const mkId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

/* ─────────────────────────────────────────────────────────────
   Block type definitions
───────────────────────────────────────────────────────────── */
interface HeroBlock {
  id: string; type: 'hero'
  navBrand: string; badge: string
  title: string; subtitle: string
  bgImage: string
  overlayColor: string; overlayOpacity: number
  ctaPrimary: string; ctaPrimaryUrl: string; ctaSecondary: string
  align: 'left' | 'center'
}
interface TextBlock {
  id: string; type: 'text'
  title: string; body: string
  align: 'left' | 'center'
  bg: string; textColor: string
}
interface FeatureItem { icon: string; title: string; desc: string }
interface FeaturesBlock {
  id: string; type: 'features'
  title: string; subtitle: string; columns: 2 | 3
  items: FeatureItem[]
  bg: string; cardBg: string; accentColor: string; textColor: string
}
interface ImageBlock {
  id: string; type: 'image'
  src: string; alt: string; fullWidth: boolean; caption: string
}
interface CtaBlock {
  id: string; type: 'cta'
  title: string; subtitle: string
  btnText: string; btnUrl: string; btnColor: string
  bg: string; textColor: string
}
interface StatsBlock {
  id: string; type: 'stats'
  items: { value: string; label: string }[]
  bg: string; valueColor: string; labelColor: string
}
type Block = HeroBlock | TextBlock | FeaturesBlock | ImageBlock | CtaBlock | StatsBlock

/* ─────────────────────────────────────────────────────────────
   Block defaults
───────────────────────────────────────────────────────────── */
const mkHero = (o: Partial<Omit<HeroBlock, 'id' | 'type'>> = {}): HeroBlock => ({
  id: mkId(), type: 'hero',
  navBrand: 'AF Home', badge: 'Partner Storefront',
  title: 'Sell Premium Furniture Under Your Brand',
  subtitle: 'No inventory. No warehouse. Just your brand powered by Apsara Home.',
  bgImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80',
  overlayColor: '#000000', overlayOpacity: 55,
  ctaPrimary: 'Become a Partner', ctaPrimaryUrl: '',
  ctaSecondary: 'Learn More', align: 'center', ...o,
})
const mkText = (o: Partial<Omit<TextBlock, 'id' | 'type'>> = {}): TextBlock => ({
  id: mkId(), type: 'text',
  title: 'Why Partner With Us',
  body: 'Apsara Home provides everything you need to run a successful online furniture store. We handle logistics, inventory, and fulfillment — you focus on building your brand and earning commissions.',
  align: 'center', bg: '#ffffff', textColor: '#1e293b', ...o,
})
const mkFeatures = (o: Partial<Omit<FeaturesBlock, 'id' | 'type'>> = {}): FeaturesBlock => ({
  id: mkId(), type: 'features',
  title: 'Everything Included', subtitle: 'Focus on selling. We handle the rest.', columns: 3,
  items: [
    { icon: '🛋️', title: 'AF Homes Catalog', desc: 'All products sourced and managed by AF Homes.' },
    { icon: '🎨', title: 'Custom Branding', desc: 'Your logo, colors, and store name.' },
    { icon: '📦', title: 'Zero Inventory', desc: 'No stock management — AF Homes handles it all.' },
    { icon: '🔔', title: 'Instant Notifications', desc: 'Get notified on every order instantly.' },
    { icon: '💰', title: 'Commission Earnings', desc: 'Earn on every delivered order.' },
    { icon: '⚡', title: 'Launch Fast', desc: 'Your store goes live in days, not months.' },
  ],
  bg: '#f8fafc', cardBg: '#ffffff', accentColor: '#6366f1', textColor: '#1e293b', ...o,
})
const mkImage = (o: Partial<Omit<ImageBlock, 'id' | 'type'>> = {}): ImageBlock => ({
  id: mkId(), type: 'image',
  src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=80',
  alt: 'Modern living room', fullWidth: true, caption: '', ...o,
})
const mkCta = (o: Partial<Omit<CtaBlock, 'id' | 'type'>> = {}): CtaBlock => ({
  id: mkId(), type: 'cta',
  title: 'Start Selling Under Your Brand',
  subtitle: 'Join Apsara Home and launch your branded storefront — no inventory, no hassle.',
  btnText: 'Become a Partner', btnUrl: '', btnColor: '#6366f1',
  bg: '#0f172a', textColor: '#ffffff', ...o,
})
const mkStats = (o: Partial<Omit<StatsBlock, 'id' | 'type'>> = {}): StatsBlock => ({
  id: mkId(), type: 'stats',
  items: [
    { value: '500+', label: 'Active Partners' },
    { value: '₱2.4M', label: 'Monthly Revenue' },
    { value: '10K+', label: 'Products Available' },
    { value: '98%', label: 'Satisfaction Rate' },
  ],
  bg: '#1e293b', valueColor: '#f59e0b', labelColor: '#94a3b8', ...o,
})

/* ─────────────────────────────────────────────────────────────
   Template presets
───────────────────────────────────────────────────────────── */
type TemplateId = 'classic-dark' | 'light-airy' | 'bold-gradient'

const TEMPLATE_BLOCKS: Record<TemplateId, () => Block[]> = {
  'classic-dark': () => [
    mkHero({ overlayColor: '#000000', overlayOpacity: 60, align: 'center' }),
    mkStats({ bg: '#111827', valueColor: '#f59e0b', labelColor: '#6b7280' }),
    mkFeatures({ bg: '#0f172a', cardBg: '#1e293b', textColor: '#e2e8f0', accentColor: '#f59e0b' }),
    mkCta({ bg: '#1d1d2e', btnColor: '#f59e0b', textColor: '#ffffff' }),
  ],
  'light-airy': () => [
    mkHero({ overlayColor: '#0f172a', overlayOpacity: 40, align: 'left' }),
    mkText({ bg: '#faf7f3', textColor: '#1e293b' }),
    mkFeatures({ bg: '#faf7f3', cardBg: '#ffffff', textColor: '#374151', accentColor: '#6366f1' }),
    mkCta({ bg: '#6366f1', btnColor: '#f97316', textColor: '#ffffff' }),
  ],
  'bold-gradient': () => [
    mkHero({ overlayColor: '#7c3aed', overlayOpacity: 75, align: 'center' }),
    mkStats({ bg: '#ffffff', valueColor: '#7c3aed', labelColor: '#6b7280' }),
    mkFeatures({ bg: '#f5f3ff', cardBg: '#ffffff', textColor: '#1e293b', accentColor: '#7c3aed' }),
    mkCta({ bg: '#4c1d95', btnColor: '#a78bfa', textColor: '#ffffff' }),
  ],
}

/* ─────────────────────────────────────────────────────────────
   Block renderers
───────────────────────────────────────────────────────────── */
function RenderHero({ b }: { b: HeroBlock }) {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: 520 }}>
      <img
        src={b.bgImage || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80'}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: b.overlayColor, opacity: b.overlayOpacity / 100 }} />
      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-10 py-5" style={{ background: 'rgba(0,0,0,0.12)' }}>
        <span className="text-lg font-bold text-white">{b.navBrand || 'AF Home'}</span>
        <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <span>Home</span><span>Ecosystem</span><span>Earnings</span><span>Benefits</span>
        </div>
        <span className="hidden rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur md:block">
          Login
        </span>
      </div>
      {/* Content */}
      <div className={`relative z-10 flex min-h-[440px] flex-col justify-center px-10 py-16 ${b.align === 'center' ? 'items-center text-center' : 'items-start'}`}>
        <span className="mb-4 inline-block rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
          {b.badge}
        </span>
        <h1 className="max-w-3xl text-4xl font-black leading-tight text-white lg:text-5xl">
          {b.title || 'Sell Premium Furniture Under Your Brand'}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">
          {b.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="rounded-full px-7 py-3 text-sm font-bold text-white shadow-xl" style={{ backgroundColor: '#6366f1' }}>
            {b.ctaPrimary}
          </span>
          <span className="rounded-full border border-white/25 px-7 py-3 text-sm font-medium text-white/80">
            {b.ctaSecondary}
          </span>
        </div>
      </div>
    </div>
  )
}

function RenderText({ b }: { b: TextBlock }) {
  return (
    <div style={{ backgroundColor: b.bg }} className="px-10 py-16">
      <div className={`mx-auto max-w-3xl ${b.align === 'center' ? 'text-center' : ''}`}>
        {b.title && <h2 className="text-3xl font-bold leading-snug" style={{ color: b.textColor }}>{b.title}</h2>}
        {b.body && <p className="mt-4 text-base leading-relaxed opacity-70" style={{ color: b.textColor }}>{b.body}</p>}
      </div>
    </div>
  )
}

function RenderFeatures({ b }: { b: FeaturesBlock }) {
  return (
    <div style={{ backgroundColor: b.bg }} className="px-10 py-16">
      <div className="mx-auto max-w-6xl">
        {(b.title || b.subtitle) && (
          <div className="mb-12 text-center">
            {b.title && <h2 className="text-3xl font-bold" style={{ color: b.textColor }}>{b.title}</h2>}
            {b.subtitle && <p className="mt-2 text-base opacity-60" style={{ color: b.textColor }}>{b.subtitle}</p>}
          </div>
        )}
        <div className={`grid gap-6 ${b.columns === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          {b.items.map((item, i) => (
            <div key={i} style={{ backgroundColor: b.cardBg }} className="rounded-2xl border border-black/5 p-6 shadow-sm">
              <div className="mb-4 text-3xl">{item.icon}</div>
              <h3 className="mb-2 font-semibold" style={{ color: b.textColor }}>{item.title}</h3>
              <p className="text-sm leading-relaxed opacity-60" style={{ color: b.textColor }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RenderImage({ b }: { b: ImageBlock }) {
  return (
    <div className={b.fullWidth ? 'w-full' : 'px-10 py-8'}>
      {b.src ? (
        <img
          src={b.src}
          alt={b.alt || ''}
          className={`w-full object-cover ${b.fullWidth ? 'max-h-[500px]' : 'rounded-2xl shadow-lg'}`}
          onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='300'%3E%3Crect width='800' height='300' fill='%23e2e8f0'/%3E%3Ctext x='400' y='155' text-anchor='middle' fill='%2394a3b8' font-size='16' font-family='sans-serif'%3EImage not found%3C/text%3E%3C/svg%3E" }}
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-slate-100">
          <ImageIcon className="h-10 w-10 text-slate-300" />
        </div>
      )}
      {b.caption && <p className="mt-2 text-center text-xs text-slate-400">{b.caption}</p>}
    </div>
  )
}

function RenderCta({ b }: { b: CtaBlock }) {
  return (
    <div style={{ backgroundColor: b.bg }} className="px-10 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-black leading-snug" style={{ color: b.textColor }}>{b.title}</h2>
        <p className="mt-4 text-lg leading-relaxed opacity-60" style={{ color: b.textColor }}>{b.subtitle}</p>
        <div className="mt-10">
          <span className="inline-block rounded-2xl px-10 py-4 text-sm font-bold text-white shadow-xl" style={{ backgroundColor: b.btnColor }}>
            {b.btnText}
          </span>
        </div>
      </div>
    </div>
  )
}

function RenderStats({ b }: { b: StatsBlock }) {
  const cols = b.items.length <= 2 ? 'grid-cols-2' : b.items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
  return (
    <div style={{ backgroundColor: b.bg }} className="px-10 py-14">
      <div className={`mx-auto max-w-4xl grid gap-10 ${cols}`}>
        {b.items.map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-4xl font-black" style={{ color: b.valueColor }}>{item.value}</p>
            <p className="mt-2 text-sm" style={{ color: b.labelColor }}>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BlockCanvas({ block }: { block: Block }) {
  switch (block.type) {
    case 'hero': return <RenderHero b={block} />
    case 'text': return <RenderText b={block} />
    case 'features': return <RenderFeatures b={block} />
    case 'image': return <RenderImage b={block} />
    case 'cta': return <RenderCta b={block} />
    case 'stats': return <RenderStats b={block} />
  }
}

/* ─────────────────────────────────────────────────────────────
   Block type meta (for add panel)
───────────────────────────────────────────────────────────── */
const BLOCK_META = [
  { type: 'hero' as const, label: 'Hero', icon: Layout, desc: 'Full-width hero with headline & CTA', mk: () => mkHero() },
  { type: 'text' as const, label: 'Text', icon: Type, desc: 'Title and paragraph text', mk: () => mkText() },
  { type: 'features' as const, label: 'Features', icon: LayoutGrid, desc: 'Grid of feature/benefit cards', mk: () => mkFeatures() },
  { type: 'image' as const, label: 'Image', icon: ImageIcon, desc: 'Full-width or contained image', mk: () => mkImage() },
  { type: 'cta' as const, label: 'CTA', icon: Zap, desc: 'Call to action banner with button', mk: () => mkCta() },
  { type: 'stats' as const, label: 'Stats', icon: TrendingUp, desc: 'Row of statistic numbers', mk: () => mkStats() },
]

const BLOCK_LABEL: Record<Block['type'], string> = {
  hero: 'Hero', text: 'Text Section', features: 'Features Grid',
  image: 'Image', cta: 'CTA Banner', stats: 'Stats Row',
}

/* ─────────────────────────────────────────────────────────────
   Form helpers
───────────────────────────────────────────────────────────── */
const iCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
const lCls = 'text-[10px] font-semibold uppercase tracking-wider text-slate-400'

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><p className={lCls}>{label}</p>{children}</div>
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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
function AlignPicker({ value, onChange }: { value: 'left' | 'center'; onChange: (v: 'left' | 'center') => void }) {
  return (
    <F label="Alignment">
      <div className="flex gap-2">
        {(['left', 'center'] as const).map((a) => (
          <button
            key={a} type="button" onClick={() => onChange(a)}
            className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold capitalize transition ${value === a ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >{a}</button>
        ))}
      </div>
    </F>
  )
}

/* ─────────────────────────────────────────────────────────────
   Properties panels per block type
───────────────────────────────────────────────────────────── */
function HeroProps({ block, onChange }: { block: HeroBlock; onChange: (b: HeroBlock) => void }) {
  const set = <K extends keyof HeroBlock>(k: K, v: HeroBlock[K]) => onChange({ ...block, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Brand Name"><input value={block.navBrand} onChange={(e) => set('navBrand', e.target.value)} className={iCls} placeholder="AF Home" /></F>
      <F label="Badge Text"><input value={block.badge} onChange={(e) => set('badge', e.target.value)} className={iCls} placeholder="Partner Storefront" /></F>
      <F label="Headline"><input value={block.title} onChange={(e) => set('title', e.target.value)} className={iCls} placeholder="Main headline…" /></F>
      <F label="Subheading"><textarea value={block.subtitle} onChange={(e) => set('subtitle', e.target.value)} rows={3} className={iCls} placeholder="Supporting text…" /></F>
      <F label="Background Image URL">
        <input value={block.bgImage} onChange={(e) => set('bgImage', e.target.value)} className={iCls} placeholder="https://images.unsplash.com/…" />
        {block.bgImage && (
          <img src={block.bgImage} alt="" className="mt-1.5 h-20 w-full rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
      </F>
      <ColorRow label="Overlay Color" value={block.overlayColor} onChange={(v) => set('overlayColor', v)} />
      <RangeRow label="Overlay Opacity" value={block.overlayOpacity} onChange={(v) => set('overlayOpacity', v)} />
      <AlignPicker value={block.align} onChange={(v) => set('align', v)} />
      <F label="Primary Button"><input value={block.ctaPrimary} onChange={(e) => set('ctaPrimary', e.target.value)} className={iCls} placeholder="Become a Partner" /></F>
      <F label="Primary Button URL"><input value={block.ctaPrimaryUrl} onChange={(e) => set('ctaPrimaryUrl', e.target.value)} className={iCls} placeholder="https://…" /></F>
      <F label="Secondary Button"><input value={block.ctaSecondary} onChange={(e) => set('ctaSecondary', e.target.value)} className={iCls} placeholder="Learn More" /></F>
    </div>
  )
}

function TextProps({ block, onChange }: { block: TextBlock; onChange: (b: TextBlock) => void }) {
  const set = <K extends keyof TextBlock>(k: K, v: TextBlock[K]) => onChange({ ...block, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Title"><input value={block.title} onChange={(e) => set('title', e.target.value)} className={iCls} placeholder="Section title…" /></F>
      <F label="Body"><textarea value={block.body} onChange={(e) => set('body', e.target.value)} rows={5} className={iCls} placeholder="Paragraph text…" /></F>
      <AlignPicker value={block.align} onChange={(v) => set('align', v)} />
      <ColorRow label="Background" value={block.bg} onChange={(v) => set('bg', v)} />
      <ColorRow label="Text Color" value={block.textColor} onChange={(v) => set('textColor', v)} />
    </div>
  )
}

function FeaturesProps({ block, onChange }: { block: FeaturesBlock; onChange: (b: FeaturesBlock) => void }) {
  const set = <K extends keyof FeaturesBlock>(k: K, v: FeaturesBlock[K]) => onChange({ ...block, [k]: v })
  const updateItem = (i: number, key: keyof FeatureItem, v: string) => {
    const items = block.items.map((item, idx) => idx === i ? { ...item, [key]: v } : item)
    set('items', items)
  }
  const addItem = () => set('items', [...block.items, { icon: '✨', title: 'New Feature', desc: 'Feature description.' }])
  const removeItem = (i: number) => set('items', block.items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <F label="Section Title"><input value={block.title} onChange={(e) => set('title', e.target.value)} className={iCls} /></F>
      <F label="Subtitle"><input value={block.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={iCls} /></F>
      <F label="Columns">
        <div className="flex gap-2">
          {([2, 3] as const).map((c) => (
            <button key={c} type="button" onClick={() => set('columns', c)}
              className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold transition ${block.columns === c ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500'}`}
            >{c} columns</button>
          ))}
        </div>
      </F>
      <ColorRow label="Background" value={block.bg} onChange={(v) => set('bg', v)} />
      <ColorRow label="Card Background" value={block.cardBg} onChange={(v) => set('cardBg', v)} />
      <ColorRow label="Accent Color" value={block.accentColor} onChange={(v) => set('accentColor', v)} />
      <ColorRow label="Text Color" value={block.textColor} onChange={(v) => set('textColor', v)} />
      <div className="space-y-2">
        <p className={lCls}>Feature Items</p>
        {block.items.map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1.5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-1.5">
              <input value={item.icon} onChange={(e) => updateItem(i, 'icon', e.target.value)}
                className="w-12 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="🎯" />
              <input value={item.title} onChange={(e) => updateItem(i, 'title', e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Title" />
              <button type="button" onClick={() => removeItem(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </div>
            <input value={item.desc} onChange={(e) => updateItem(i, 'desc', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900" placeholder="Description" />
          </div>
        ))}
        <button type="button" onClick={addItem}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
          <Plus className="h-3 w-3" /> Add item
        </button>
      </div>
    </div>
  )
}

function ImageProps({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  const set = <K extends keyof ImageBlock>(k: K, v: ImageBlock[K]) => onChange({ ...block, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Image URL">
        <input value={block.src} onChange={(e) => set('src', e.target.value)} className={iCls} placeholder="https://images.unsplash.com/…" />
        {block.src && (
          <img src={block.src} alt="" className="mt-1.5 h-28 w-full rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
      </F>
      <F label="Alt Text"><input value={block.alt} onChange={(e) => set('alt', e.target.value)} className={iCls} placeholder="Describe the image…" /></F>
      <F label="Caption"><input value={block.caption} onChange={(e) => set('caption', e.target.value)} className={iCls} placeholder="Optional caption…" /></F>
      <F label="Width">
        <div className="flex gap-2">
          {[{ v: true, l: 'Full Width' }, { v: false, l: 'Contained' }].map(({ v, l }) => (
            <button key={l} type="button" onClick={() => set('fullWidth', v)}
              className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold transition ${block.fullWidth === v ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500'}`}
            >{l}</button>
          ))}
        </div>
      </F>
    </div>
  )
}

function CtaProps({ block, onChange }: { block: CtaBlock; onChange: (b: CtaBlock) => void }) {
  const set = <K extends keyof CtaBlock>(k: K, v: CtaBlock[K]) => onChange({ ...block, [k]: v })
  return (
    <div className="space-y-3">
      <F label="Headline"><input value={block.title} onChange={(e) => set('title', e.target.value)} className={iCls} /></F>
      <F label="Subheading"><textarea value={block.subtitle} onChange={(e) => set('subtitle', e.target.value)} rows={3} className={iCls} /></F>
      <F label="Button Text"><input value={block.btnText} onChange={(e) => set('btnText', e.target.value)} className={iCls} /></F>
      <F label="Button URL"><input value={block.btnUrl} onChange={(e) => set('btnUrl', e.target.value)} className={iCls} placeholder="https://…" /></F>
      <ColorRow label="Button Color" value={block.btnColor} onChange={(v) => set('btnColor', v)} />
      <ColorRow label="Background" value={block.bg} onChange={(v) => set('bg', v)} />
      <ColorRow label="Text Color" value={block.textColor} onChange={(v) => set('textColor', v)} />
    </div>
  )
}

function StatsProps({ block, onChange }: { block: StatsBlock; onChange: (b: StatsBlock) => void }) {
  const set = <K extends keyof StatsBlock>(k: K, v: StatsBlock[K]) => onChange({ ...block, [k]: v })
  const updateItem = (i: number, key: 'value' | 'label', v: string) => {
    const items = block.items.map((item, idx) => idx === i ? { ...item, [key]: v } : item)
    set('items', items)
  }
  const addItem = () => set('items', [...block.items, { value: '0', label: 'New Stat' }])
  const removeItem = (i: number) => set('items', block.items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <ColorRow label="Background" value={block.bg} onChange={(v) => set('bg', v)} />
      <ColorRow label="Value Color" value={block.valueColor} onChange={(v) => set('valueColor', v)} />
      <ColorRow label="Label Color" value={block.labelColor} onChange={(v) => set('labelColor', v)} />
      <div className="space-y-2">
        <p className={lCls}>Stats</p>
        {block.items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input value={item.value} onChange={(e) => updateItem(i, 'value', e.target.value)}
              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800" placeholder="500+" />
            <input value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800" placeholder="Label" />
            <button type="button" onClick={() => removeItem(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
          <Plus className="h-3 w-3" /> Add stat
        </button>
      </div>
    </div>
  )
}

function PropertiesPanel({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
          {BLOCK_LABEL[block.type]}
        </span>
      </div>
      {block.type === 'hero' && <HeroProps block={block} onChange={onChange as (b: HeroBlock) => void} />}
      {block.type === 'text' && <TextProps block={block} onChange={onChange as (b: TextBlock) => void} />}
      {block.type === 'features' && <FeaturesProps block={block} onChange={onChange as (b: FeaturesBlock) => void} />}
      {block.type === 'image' && <ImageProps block={block} onChange={onChange as (b: ImageBlock) => void} />}
      {block.type === 'cta' && <CtaProps block={block} onChange={onChange as (b: CtaBlock) => void} />}
      {block.type === 'stats' && <StatsProps block={block} onChange={onChange as (b: StatsBlock) => void} />}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Add-block panel
───────────────────────────────────────────────────────────── */
function AddBlockPanel({ onAdd }: { onAdd: (b: Block) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400 dark:text-slate-500">Click a block to add it below the current selection.</p>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_META.map(({ type, label, icon: Icon, desc, mk }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(mk())}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{label}</p>
              <p className="text-[10px] leading-snug text-slate-400">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Template picker thumbnails
───────────────────────────────────────────────────────────── */
function TemplateSVG({ id }: { id: TemplateId }) {
  if (id === 'classic-dark') return (
    <svg viewBox="0 0 320 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#0a0a0f" />
      {/* hero bg */}
      <rect width="320" height="118" fill="#111118" />
      <rect width="320" height="118" fill="url(#hd1)" />
      <defs>
        <linearGradient id="hd1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      {/* nav */}
      <rect width="320" height="22" fill="#000" opacity="0.4"/>
      <rect x="10" y="7" width="40" height="8" rx="3" fill="#fff" opacity="0.85"/>
      <rect x="120" y="8" width="18" height="6" rx="2" fill="#fff" opacity="0.25"/>
      <rect x="142" y="8" width="18" height="6" rx="2" fill="#fff" opacity="0.25"/>
      <rect x="164" y="8" width="18" height="6" rx="2" fill="#fff" opacity="0.25"/>
      <rect x="275" y="7" width="36" height="8" rx="4" fill="#6366f1"/>
      {/* hero text */}
      <rect x="80" y="38" width="160" height="12" rx="3" fill="#fff" opacity="0.9"/>
      <rect x="95" y="55" width="130" height="7" rx="2" fill="#fff" opacity="0.4"/>
      <rect x="105" y="66" width="110" height="6" rx="2" fill="#fff" opacity="0.3"/>
      {/* ctas */}
      <rect x="100" y="80" width="56" height="14" rx="7" fill="#6366f1"/>
      <rect x="162" y="80" width="56" height="14" rx="7" fill="#fff" opacity="0.1"/>
      {/* stats row */}
      <rect y="118" width="320" height="30" fill="#111827"/>
      <rect x="30" y="126" width="30" height="8" rx="2" fill="#f59e0b" opacity="0.8"/>
      <rect x="30" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.6"/>
      <rect x="110" y="126" width="30" height="8" rx="2" fill="#f59e0b" opacity="0.8"/>
      <rect x="110" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.6"/>
      <rect x="190" y="126" width="30" height="8" rx="2" fill="#f59e0b" opacity="0.8"/>
      <rect x="190" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.6"/>
      <rect x="270" y="126" width="30" height="8" rx="2" fill="#f59e0b" opacity="0.8"/>
      <rect x="270" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.6"/>
      {/* features */}
      <rect y="148" width="320" height="52" fill="#0f172a"/>
      <rect x="10" y="156" width="90" height="36" rx="6" fill="#1e293b"/>
      <rect x="115" y="156" width="90" height="36" rx="6" fill="#1e293b"/>
      <rect x="220" y="156" width="90" height="36" rx="6" fill="#1e293b"/>
    </svg>
  )
  if (id === 'light-airy') return (
    <svg viewBox="0 0 320 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#faf7f3"/>
      {/* nav */}
      <rect width="320" height="22" fill="#fff" opacity="0.95"/>
      <rect x="10" y="7" width="40" height="8" rx="3" fill="#6366f1" opacity="0.85"/>
      <rect x="120" y="8" width="18" height="6" rx="2" fill="#374151" opacity="0.4"/>
      <rect x="142" y="8" width="18" height="6" rx="2" fill="#374151" opacity="0.4"/>
      <rect x="275" y="7" width="36" height="8" rx="4" fill="#6366f1"/>
      {/* hero — two col */}
      <rect y="22" width="320" height="90" fill="#faf7f3"/>
      <rect x="10" y="34" width="130" height="11" rx="3" fill="#1e293b" opacity="0.85"/>
      <rect x="10" y="50" width="110" height="7" rx="2" fill="#374151" opacity="0.45"/>
      <rect x="10" y="61" width="90" height="6" rx="2" fill="#374151" opacity="0.3"/>
      <rect x="10" y="74" width="54" height="14" rx="7" fill="#6366f1"/>
      <rect x="70" y="74" width="54" height="14" rx="7" fill="none" stroke="#6366f1" strokeWidth="1.2" opacity="0.6"/>
      {/* image right */}
      <rect x="165" y="26" width="145" height="82" rx="10" fill="#e8e0d4"/>
      <rect x="178" y="36" width="119" height="62" rx="7" fill="#d9cfbf"/>
      {/* text section */}
      <rect y="112" width="320" height="36" fill="#fff"/>
      <rect x="110" y="120" width="100" height="9" rx="3" fill="#1e293b" opacity="0.6"/>
      <rect x="80" y="133" width="160" height="6" rx="2" fill="#94a3b8" opacity="0.5"/>
      {/* features */}
      <rect y="148" width="320" height="52" fill="#faf7f3"/>
      <rect x="10" y="156" width="90" height="36" rx="6" fill="#fff"/>
      <rect x="115" y="156" width="90" height="36" rx="6" fill="#fff"/>
      <rect x="220" y="156" width="90" height="36" rx="6" fill="#fff"/>
    </svg>
  )
  /* bold-gradient */
  return (
    <svg viewBox="0 0 320 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#bg3)"/>
      {/* nav */}
      <rect width="320" height="22" fill="#000" opacity="0.2"/>
      <rect x="10" y="7" width="40" height="8" rx="3" fill="#fff" opacity="0.9"/>
      <rect x="275" y="7" width="36" height="8" rx="4" fill="#fff" opacity="0.15"/>
      {/* hero — centered */}
      <rect x="60" y="40" width="200" height="14" rx="4" fill="#fff" opacity="0.95"/>
      <rect x="80" y="59" width="160" height="8" rx="3" fill="#fff" opacity="0.45"/>
      <rect x="98" y="71" width="124" height="6" rx="2" fill="#fff" opacity="0.3"/>
      <rect x="88" y="86" width="64" height="16" rx="8" fill="#a78bfa"/>
      <rect x="158" y="86" width="64" height="16" rx="8" fill="#fff" opacity="0.1"/>
      {/* stats on white */}
      <rect y="118" width="320" height="30" fill="#fff"/>
      <rect x="30" y="126" width="30" height="8" rx="2" fill="#7c3aed" opacity="0.8"/>
      <rect x="30" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.5"/>
      <rect x="110" y="126" width="30" height="8" rx="2" fill="#7c3aed" opacity="0.8"/>
      <rect x="110" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.5"/>
      <rect x="190" y="126" width="30" height="8" rx="2" fill="#7c3aed" opacity="0.8"/>
      <rect x="190" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.5"/>
      <rect x="270" y="126" width="30" height="8" rx="2" fill="#7c3aed" opacity="0.8"/>
      <rect x="270" y="136" width="24" height="5" rx="1" fill="#6b7280" opacity="0.5"/>
      {/* features */}
      <rect y="148" width="320" height="52" fill="#f5f3ff"/>
      <rect x="10" y="156" width="90" height="36" rx="6" fill="#fff"/>
      <rect x="115" y="156" width="90" height="36" rx="6" fill="#fff"/>
      <rect x="220" y="156" width="90" height="36" rx="6" fill="#fff"/>
    </svg>
  )
}

const TEMPLATES: { id: TemplateId; name: string; tag: string; desc: string }[] = [
  { id: 'classic-dark', name: 'Classic Dark', tag: 'Dark immersive', desc: 'Dark full-screen hero with amber accents, stats row, and feature grid.' },
  { id: 'light-airy', name: 'Light & Airy', tag: 'Warm & clean', desc: 'Warm cream background, two-column hero layout, and minimal cards.' },
  { id: 'bold-gradient', name: 'Bold Gradient', tag: 'Purple gradient', desc: 'Centered gradient hero with strong typography and vivid color palette.' },
]

/* ─────────────────────────────────────────────────────────────
   Serialise / deserialise blocks for API
───────────────────────────────────────────────────────────── */
function blocksToPayload(blocks: Block[]): string {
  return JSON.stringify(blocks)
}
function blocksFromPayload(raw: string | undefined): Block[] | null {
  if (!raw) return null
  try { return JSON.parse(raw) as Block[] } catch { return null }
}

/* ─────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────── */
export default function LandingPageStudio() {
  const { data, isLoading } = useGetAdminWebPageItemsQuery({ type: 'partner_storefront' } as never)
  const [updateItem, { isLoading: isSaving }] = useUpdateAdminWebPageItemMutation()

  const [item, setItem] = useState<WebPageItem | null>(null)
  const [template, setTemplate] = useState<TemplateId | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'add' | 'props'>('add')
  const [mobile, setMobile] = useState(false)

  const dragRef = { from: -1, to: -1 }

  /* load */
  useEffect(() => {
    const items = (data as { items?: WebPageItem[] } | undefined)?.items ?? []
    const first = items[0]
    if (!first) return
    setItem(first)
    const fields = ((first.payload as { fields?: Record<string, string> } | null)?.fields) ?? {}
    const t = fields.landing_template as TemplateId | undefined
    if (t === 'classic-dark' || t === 'light-airy' || t === 'bold-gradient') setTemplate(t)
    const saved = blocksFromPayload(fields.page_blocks)
    if (saved && saved.length > 0) setBlocks(saved)
    else if (t) setBlocks(TEMPLATE_BLOCKS[t]())
  }, [data])

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null

  const addBlock = (b: Block) => {
    const idx = blocks.findIndex((bl) => bl.id === selectedId)
    const next = [...blocks]
    next.splice(idx === -1 ? next.length : idx + 1, 0, b)
    setBlocks(next)
    setSelectedId(b.id)
    setRightTab('props')
  }

  const updateBlock = (updated: Block) =>
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedId === id) { setSelectedId(null); setRightTab('add') }
  }

  const moveBlock = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id)
    if (i < 0) return
    const next = [...blocks]
    const j = i + dir
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]
    setBlocks(next)
  }

  const handleSave = async () => {
    if (!item || !template) return
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
              landing_template: template,
              page_blocks: blocksToPayload(blocks),
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-400">No storefront found. Create one in the Storefronts page first.</p>
      </div>
    )
  }

  /* ── Step 1: Template picker ───────────────────────────────── */
  if (!template) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Choose a Template</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pick a starting layout. You can add, remove, and rearrange every section after.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => { setTemplate(tpl.id); setBlocks(TEMPLATE_BLOCKS[tpl.id]()) }}
              className="group flex flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white text-left shadow-sm transition-all hover:border-indigo-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="overflow-hidden">
                <TemplateSVG id={tpl.id} />
              </div>
              <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{tpl.name}</p>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">{tpl.tag}</span>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{tpl.desc}</p>
                <div className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Use this template →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const storeName = (blocks.find((b) => b.type === 'hero') as HeroBlock | undefined)?.navBrand?.toLowerCase().replace(/\s+/g, '-') || 'your-store'

  /* ── Step 2: Page builder ─────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setTemplate(null); setBlocks([]); setSelectedId(null) }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700"
            title="Change template"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              Landing Page Builder
            </h1>
            <p className="text-[11px] text-slate-400">Click a section to edit · drag ↕ to reorder · add blocks from the right panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/${storeName}`} target="_blank" rel="noreferrer" title="Open live page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600">
            <Eye className="h-4 w-4" />
          </a>
          <button type="button" onClick={() => setMobile(false)} title="Desktop"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${!mobile ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>
            <Monitor className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setMobile(true)} title="Mobile"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${mobile ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>
            <Smartphone className="h-4 w-4" />
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
              afhome.ph/{storeName}
            </div>
          </div>

          {/* Page canvas */}
          <div className="flex min-h-0 flex-1 justify-center overflow-y-auto p-4">
            <div
              className="w-full overflow-hidden rounded-xl bg-white shadow-2xl"
              style={{ maxWidth: mobile ? 390 : '100%' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) { setSelectedId(null); setRightTab('add') }
              }}
            >
              {blocks.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                  <LayoutGrid className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No blocks yet. Add one from the right panel.</p>
                </div>
              )}
              {blocks.map((block, i) => {
                const selected = block.id === selectedId
                return (
                  <div
                    key={block.id}
                    className={`group relative cursor-pointer outline-none transition-all ${selected ? 'ring-2 ring-inset ring-indigo-500' : 'hover:ring-1 hover:ring-inset hover:ring-indigo-300'}`}
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
                    {/* Block toolbar (shown when selected) */}
                    {selected && (
                      <div
                        className="absolute left-2 top-2 z-30 flex items-center gap-1 rounded-xl bg-indigo-600 px-2 py-1 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-3.5 w-3.5 cursor-grab text-white/70" />
                        <span className="text-[11px] font-semibold text-white">{BLOCK_LABEL[block.type]}</span>
                        <div className="mx-1 h-3 w-px bg-white/25" />
                        <button type="button" onClick={() => moveBlock(block.id, -1)} title="Move up"
                          disabled={i === 0}
                          className="rounded p-0.5 text-white/80 transition hover:bg-white/20 disabled:opacity-30">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => moveBlock(block.id, 1)} title="Move down"
                          disabled={i === blocks.length - 1}
                          className="rounded p-0.5 text-white/80 transition hover:bg-white/20 disabled:opacity-30">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => deleteBlock(block.id)} title="Delete block"
                          className="rounded p-0.5 text-white/80 transition hover:bg-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {/* Hover label when not selected */}
                    {!selected && (
                      <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                        {BLOCK_LABEL[block.type]}
                      </div>
                    )}
                    <BlockCanvas block={block} />
                  </div>
                )
              })}

              {/* Add block button at bottom */}
              <div className="flex items-center justify-center border-t border-dashed border-slate-200 py-4">
                <button
                  type="button"
                  onClick={() => { setSelectedId(null); setRightTab('add') }}
                  className="flex items-center gap-2 rounded-full border border-dashed border-indigo-300 px-5 py-2 text-xs font-semibold text-indigo-500 transition hover:bg-indigo-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Block
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex w-72 shrink-0 flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {/* Tabs */}
          <div className="flex shrink-0 gap-0 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRightTab('add')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${rightTab === 'add' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Plus className="h-3.5 w-3.5" /> Add Block
            </button>
            <button
              type="button"
              onClick={() => setRightTab('props')}
              disabled={!selectedBlock}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition disabled:opacity-40 ${rightTab === 'props' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Type className="h-3.5 w-3.5" /> Properties
            </button>
          </div>

          {/* Panel content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden">
            {rightTab === 'add' && <AddBlockPanel onAdd={addBlock} />}
            {rightTab === 'props' && selectedBlock && (
              <PropertiesPanel block={selectedBlock} onChange={updateBlock} />
            )}
            {rightTab === 'props' && !selectedBlock && (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                <LayoutGrid className="h-6 w-6 opacity-30" />
                <p className="text-center text-xs">Click a block on the canvas to edit its properties.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
