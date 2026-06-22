'use client'

import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useCreateAdminWebPageItemMutation,
  useDeleteAdminWebPageItemMutation,
  useGetAdminWebPageItemsQuery,
  useUpdateAdminWebPageItemMutation,
  type WebPageItem,
  type WebPageType,
} from '@/store/api/webPagesApi'
import { showErrorToast, showSuccessToast } from '@/libs/toast'
import { revalidateDreamBuild } from '@/libs/revalidateDreamBuild'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// ─── Types ──────────────────────────────────────────────────────────────────────

type SectionField = {
  key: string
  label: string
  kind?: 'text' | 'textarea' | 'select' | 'image-list' | 'chips'
  options?: string[]
}

type DreamBuildSection = {
  id: WebPageType
  label: string
  helper: string
  itemLabel: string
  dot: string
  fields: SectionField[]
}

type FormState = {
  key: string
  title: string
  subtitle: string
  body: string
  image_url: string
  link_url: string
  button_text: string
  sort_order: string
  is_active: boolean
  payload: Record<string, string>
}

// ─── Section config ─────────────────────────────────────────────────────────────

const sections: DreamBuildSection[] = [
  {
    id: 'dreambuild-hero',
    label: 'Hero Section',
    dot: 'bg-violet-400',
    itemLabel: 'Hero block',
    helper: 'Headline, CTA buttons, carousel images, stats.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow text' },
      { key: 'primary_button_text', label: 'Primary button text' },
      { key: 'secondary_button_text', label: 'Secondary button text' },
      { key: 'stat_1_value', label: 'Stat 1 value' },
      { key: 'stat_1_label', label: 'Stat 1 label' },
      { key: 'stat_2_value', label: 'Stat 2 value' },
      { key: 'stat_2_label', label: 'Stat 2 label' },
      { key: 'stat_3_value', label: 'Stat 3 value' },
      { key: 'stat_3_label', label: 'Stat 3 label' },
      { key: 'signature_label', label: 'Signature label' },
      { key: 'carousel_images', label: 'Carousel images', kind: 'image-list' },
    ],
  },
  {
    id: 'dreambuild-services',
    label: 'Services',
    dot: 'bg-cyan-400',
    itemLabel: 'Service',
    helper: 'Service cards: Interior Design, Sourcing & Supply, Installation & Finishing.',
    fields: [
      { key: 'section_eyebrow', label: 'Section eyebrow' },
      { key: 'section_title', label: 'Section title' },
      { key: 'section_description', label: 'Section description', kind: 'textarea' },
      { key: 'cta_text', label: 'CTA text' },
      { key: 'cta_button_text', label: 'CTA button text' },
      { key: 'service_label', label: 'Service label' },
      { key: 'service_number', label: 'Service number (01, 02…)' },
      { key: 'bullets', label: 'Bullet points (one per line)', kind: 'textarea' },
    ],
  },
  {
    id: 'dreambuild-projects',
    label: 'Projects',
    dot: 'bg-amber-400',
    itemLabel: 'Project',
    helper: 'Portfolio items shown on home and projects pages.',
    fields: [
      { key: 'section_eyebrow', label: 'Section eyebrow' },
      { key: 'section_title', label: 'Section title' },
      { key: 'tag', label: 'Tag (e.g. Full Solution - Design to Installation)' },
      { key: 'city_area', label: 'City / Area' },
      { key: 'scope_items', label: 'Scope', kind: 'chips' },
      { key: 'timeline', label: 'Timeline (e.g. 8 weeks)' },
      { key: 'card_size', label: 'Card size', kind: 'select', options: ['short', 'tall'] },
    ],
  },
  {
    id: 'dreambuild-blogs',
    label: 'Blogs',
    dot: 'bg-emerald-400',
    itemLabel: 'Blog post',
    helper: 'Blog cards and article metadata.',
    fields: [
      { key: 'category', label: 'Category' },
      { key: 'date', label: 'Date label (e.g. March 15, 2024)' },
      { key: 'read_time', label: 'Read time (e.g. 5 min read)' },
      { key: 'design_brief', label: 'Design brief / intro note', kind: 'textarea' },
      { key: 'takeaways', label: 'Key takeaways (one per line)', kind: 'textarea' },
      { key: 'sections', label: 'Article sections (Title|Body, one per line)', kind: 'textarea' },
      { key: 'gallery_images', label: 'Inspiration gallery images', kind: 'image-list' },
      { key: 'faq', label: 'FAQ items (Question|Answer, one per line)', kind: 'textarea' },
    ],
  },
  {
    id: 'dreambuild-testimonials',
    label: 'Testimonials',
    dot: 'bg-rose-400',
    itemLabel: 'Testimonial',
    helper: 'Client quotes, names, and roles.',
    fields: [
      { key: 'client_name', label: 'Client name' },
      { key: 'client_role', label: 'Client role / title' },
    ],
  },
  {
    id: 'dreambuild-gallery',
    label: 'Gallery',
    dot: 'bg-orange-400',
    itemLabel: 'Gallery item',
    helper: 'Parallax gallery images and header copy.',
    fields: [
      { key: 'section_eyebrow', label: 'Section eyebrow' },
      { key: 'section_title', label: 'Section title' },
      { key: 'cta_text', label: 'Header button text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'address', label: 'Address' },
    ],
  },
  {
    id: 'dreambuild-process',
    label: 'Process',
    dot: 'bg-sky-400',
    itemLabel: 'Process step',
    helper: 'Process steps shown from CMS records only.',
    fields: [
      { key: 'step_number', label: 'Step number (01, 02…)' },
    ],
  },
  {
    id: 'dreambuild-contact',
    label: 'Contact / Footer',
    dot: 'bg-slate-400',
    itemLabel: 'Contact block',
    helper: 'Contact info, footer notes, and CTA copy.',
    fields: [
      { key: 'email', label: 'Email address' },
      { key: 'phone', label: 'Phone / Viber' },
      { key: 'address', label: 'Location', kind: 'textarea' },
      { key: 'response_time', label: 'Response Time' },
      { key: 'status_badge', label: 'Status badge' },
    ],
  },
]

// ─── Form helpers ───────────────────────────────────────────────────────────────

const emptyForm: FormState = {
  key: '', title: '', subtitle: '', body: '',
  image_url: '', link_url: '', button_text: '',
  sort_order: '0', is_active: true, payload: {},
}

const COMPACT_PANEL_WIDTH = 360
const BLOG_PANEL_WIDTH = 704
const MIN_PANEL_WIDTH = 320
const MAX_PANEL_WIDTH = 960
const SUBTITLE_LIMIT = 255

const slugify = (v: string) =>
  v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const dateLabelToInputValue = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const inputValueToDateLabel = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''

  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`
}

const LEGACY_HERO_IMAGE_MARKERS = [
  'images.unsplash.com/photo-1618221195710',
  'images.unsplash.com/photo-1631679706909',
  'images.unsplash.com/photo-1556909114',
  'images.unsplash.com/photo-1600585154526',
]

const isLegacyHeroImageUrl = (value: string) =>
  LEGACY_HERO_IMAGE_MARKERS.some(marker => value.includes(marker))

const cleanHeroCarouselImages = (value: string) =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item && !isLegacyHeroImageUrl(item))
    .join('\n')

const isLegacyDreamBuildBlogPlaceholder = (item: WebPageItem) => {
  const title = String(item.title ?? '').trim().toLowerCase()
  const key = String(item.key ?? '').trim().toLowerCase()
  const slug = String((item.payload as Record<string, unknown> | null)?.slug ?? '').trim().toLowerCase()

  return (
    title.startsWith('19 blog examples') ||
    title === 'test blogs post' ||
    key.startsWith('19-blog-examples') ||
    key === 'test-blogs-post' ||
    slug.startsWith('19-blog-examples') ||
    slug === 'test-blogs-post'
  )
}

const isLegacyDreamBuildTestimonialPlaceholder = (item: WebPageItem) => {
  const title = String(item.title ?? '').trim().toLowerCase()
  const key = String(item.key ?? '').trim().toLowerCase()

  return (
    key === 'testimonial-collection-instructions' ||
    title === 'what clients say.'
  )
}

const LEGACY_DREAMBUILD_PROJECT_IDS = new Set([105, 106, 107])
const LEGACY_DREAMBUILD_PROJECT_KEYS = new Set([
  'warm-minimalist-residence',
  'soft-luxe-condo-suite',
  'contemporary-family-home',
])

const isLegacyDreamBuildProjectPlaceholder = (item: WebPageItem) => {
  const key = String(item.key ?? '').trim().toLowerCase()
  const createdAt = String(item.created_at ?? '').trim()
  const updatedAt = String(item.updated_at ?? '').trim()
  // Only treat as a pristine seeded sample (created and never touched since seed).
  // Once an admin edits it, updated_at moves past the seed date and it must stay
  // visible — otherwise the edited project vanishes from the canvas and the site.
  const isPristineSeed =
    createdAt.startsWith('2026-06-15') && updatedAt.startsWith('2026-06-15')

  return (
    isPristineSeed &&
    (LEGACY_DREAMBUILD_PROJECT_IDS.has(item.id) || LEGACY_DREAMBUILD_PROJECT_KEYS.has(key))
  )
}

const toForm = (item: WebPageItem, section: DreamBuildSection): FormState => {
  const p = (item.payload ?? {}) as Record<string, unknown>
  const payloadFallback = (key: string) => {
    if (section.id === 'dreambuild-projects') {
      if (key === 'section_eyebrow') return PROJECTS_HEADER_DEFAULTS.eyebrow
      if (key === 'section_title') return PROJECTS_HEADER_DEFAULTS.title
      // Seeded/legacy projects store scope under `scope`/`scope_label` and the
      // location under `location`. Fall back to those so the editor doesn't load
      // an empty Scope/City field (and then overwrite the real data on save).
      if (key === 'scope_items') {
        const legacy = p.scope ?? p.scope_label
        return typeof legacy === 'string' ? legacy : Array.isArray(legacy) ? (legacy as string[]).join('\n') : ''
      }
      if (key === 'city_area') {
        return typeof p.location === 'string' ? p.location : ''
      }
      return ''
    }
    if (section.id === 'dreambuild-gallery') {
      if (key === 'section_eyebrow') return GALLERY_HEADER_DEFAULTS.eyebrow
      if (key === 'section_title') return GALLERY_HEADER_DEFAULTS.title
      if (key === 'cta_text') return GALLERY_HEADER_DEFAULTS.ctaText
      if (key === 'cta_url') return GALLERY_HEADER_DEFAULTS.ctaUrl
      return ''
    }
    if (section.id !== 'dreambuild-services') return ''
    if (key === 'section_eyebrow') return SERVICES_HEADER_DEFAULTS.eyebrow
    if (key === 'section_title') return SERVICES_HEADER_DEFAULTS.title
    if (key === 'section_description') return SERVICES_HEADER_DEFAULTS.description
    if (key === 'service_label') return 'Solution'
    if (key === 'service_number') return String((item.sort_order ?? 0) + 1).padStart(2, '0')
    return ''
  }

  return {
    key: item.key ?? '',
    title: item.title ?? '',
    subtitle: item.subtitle ?? '',
    body: item.body ?? '',
    image_url: item.image_url ?? '',
    link_url: item.link_url ?? '',
    button_text: item.button_text ?? '',
    sort_order: String(item.sort_order ?? 0),
    is_active: item.is_active,
    payload: section.fields.reduce<Record<string, string>>((acc, f) => {
      const v = p[f.key]
      if (section.id === 'dreambuild-hero' && f.key === 'carousel_images') {
        const raw = typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join('\n') : ''
        acc[f.key] = cleanHeroCarouselImages(raw)
        return acc
      }
      if (section.id === 'dreambuild-services' && f.key === 'service_number') {
        acc[f.key] = payloadFallback(f.key)
        return acc
      }
      acc[f.key] = typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join('\n') : payloadFallback(f.key)
      return acc
    }, {}),
  }
}

const toPayload = (form: FormState, section: DreamBuildSection) => {
  const payload = Object.fromEntries(
    Object.entries(form.payload).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== ''),
  )
  // Section header fields belong only on the dedicated projects-header record.
  // Strip them from regular project records so a project is never mistaken for the
  // header (which would hide it from the grid and the live site).
  if (section.id === 'dreambuild-projects' && form.key.trim() !== PROJECTS_HEADER_KEY) {
    PROJECTS_HEADER_FIELDS.forEach((field) => {
      delete payload[field]
    })
  }
  const title = section.id === 'dreambuild-testimonials'
    ? payload.client_name || form.title.trim()
    : form.title.trim()

  if (section.id === 'dreambuild-blogs') {
    payload.slug = slugify(title)
  }

  const subtitle = section.id === 'dreambuild-services' || section.id === 'dreambuild-testimonials' || section.id === 'dreambuild-hero'
    ? null
    : form.subtitle.trim().slice(0, SUBTITLE_LIMIT) || undefined
  const linkUrl = section.id === 'dreambuild-services' || section.id === 'dreambuild-gallery' || section.id === 'dreambuild-projects' || section.id === 'dreambuild-testimonials'
    ? null
    : form.link_url.trim() || undefined
  const buttonText = section.id === 'dreambuild-services' || section.id === 'dreambuild-projects' || section.id === 'dreambuild-testimonials'
    ? null
    : form.button_text.trim() || undefined
  const serviceNumberOrder = section.id === 'dreambuild-services'
    ? Number.parseInt(form.payload.service_number || '', 10) - 1
    : Number.NaN
  const sortOrder = Number.isFinite(serviceNumberOrder) && serviceNumberOrder >= 0
    ? serviceNumberOrder
    : Number.parseInt(form.sort_order, 10) || 0

  return {
    key: form.key.trim() || slugify(title) || section.id,
    title: title || undefined,
    subtitle,
    body: form.body.trim() || undefined,
    image_url: form.image_url.trim() || undefined,
    link_url: linkUrl,
    button_text: buttonText,
    sort_order: sortOrder,
    is_active: form.is_active,
    payload,
  }
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = stableValue((value as Record<string, unknown>)[key])
      return acc
    }, {})
}

const stableStringify = (value: unknown) => JSON.stringify(stableValue(value))

const sortOrderFromForm = (form: FormState) => {
  const serviceNumberOrder = Number.parseInt(form.payload.service_number || '', 10) - 1
  return Number.isFinite(serviceNumberOrder) && serviceNumberOrder >= 0
    ? serviceNumberOrder
    : Number.parseInt(form.sort_order, 10) || 0
}

const mergeItem = (item: WebPageItem, form: FormState): WebPageItem => ({
  ...item,
  title: form.title || null,
  subtitle: form.subtitle || null,
  body: form.body || null,
  image_url: form.image_url || null,
  link_url: form.link_url || null,
  button_text: form.button_text || null,
  sort_order: sortOrderFromForm(form),
  is_active: form.is_active,
  payload: { ...((item.payload as Record<string, string>) ?? {}), ...form.payload },
})

const draftKeyFor = (type: WebPageType, id: number) => `${type}:${id}`

// Static fallback images for services (matches landing page serviceImages)
const SERVICE_IMAGES = [
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80',
  'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=900&q=80',
]

const SERVICES_CTA_DEFAULTS = {
  text: 'Not sure which service fits your project?',
  buttonText: 'Book a Free Consult',
  buttonUrl: '#contact',
}

const SERVICES_HEADER_DEFAULTS = {
  eyebrow: 'Interior Services',
  title: 'What we do best.',
  description: 'Three focused service areas, each designed to move your space forward.',
}

const GALLERY_HEADER_DEFAULTS = {
  eyebrow: 'Interior Gallery',
  title: 'A curated look at our aesthetic.',
  ctaText: 'See All Projects',
  ctaUrl: '/projects',
}

const PROJECTS_HEADER_DEFAULTS = {
  eyebrow: 'Featured Projects',
  title: "Spaces we've shaped and styled.",
}

const PROJECTS_HEADER_KEY = 'projects-header'
const PROJECTS_HEADER_FIELDS = ['section_eyebrow', 'section_title']

// The section header lives in its own record (key = projects-header). Match it by
// key only — never by the presence of section_eyebrow/section_title in the payload,
// because real projects can carry those keys (e.g. defaults baked in on an earlier
// save) and would otherwise be misclassified as the header and vanish from the grid.
const isProjectsHeaderItem = (item: WebPageItem) =>
  item.key === PROJECTS_HEADER_KEY

// ─── FieldZone — clickable sub-element within a canvas card ────────────────────

function FieldZone({
  fieldKey,
  label,
  onFocus,
  isActive,
  children,
}: {
  fieldKey: string
  label: string
  onFocus: (fieldKey: string) => void
  isActive: boolean
  children: ReactNode
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onFocus(fieldKey) }}
      className={`group/fz relative cursor-pointer rounded-lg transition-all duration-100 ${
        isActive
          ? 'bg-cyan-50/70 ring-2 ring-cyan-400 ring-offset-1'
          : 'hover:bg-cyan-50/40 hover:ring-2 hover:ring-cyan-200 hover:ring-offset-1'
      }`}
    >
      <span
        className={`pointer-events-none absolute -top-5 left-0 z-20 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white transition-opacity ${
          isActive ? 'bg-cyan-500 opacity-100' : 'bg-cyan-400 opacity-0 group-hover/fz:opacity-100'
        }`}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

// ─── Canvas primitives ──────────────────────────────────────────────────────────

function AddNewButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm font-medium text-stone-400 transition hover:border-stone-400 hover:bg-white/60 hover:text-stone-600"
    >
      <span className="text-lg leading-none">+</span>
      {label}
    </button>
  )
}

function CanvasItem({
  item, selected, onSelect, children,
}: {
  item: WebPageItem
  selected: WebPageItem | null
  onSelect: (item: WebPageItem) => void
  children: ReactNode
}) {
  const isSelected = selected?.id === item.id

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group relative h-full cursor-pointer rounded-3xl transition-all duration-150 ${
        isSelected
          ? 'ring-2 ring-cyan-500 ring-offset-4'
          : 'ring-2 ring-transparent hover:ring-2 hover:ring-cyan-300 hover:ring-offset-4'
      }`}
    >
      {/* Badge */}
      <span className={`pointer-events-none absolute -right-1 -top-1 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm transition-opacity ${
        isSelected
          ? 'bg-cyan-500 text-white opacity-100'
          : 'bg-white text-cyan-600 ring-1 ring-cyan-200 opacity-0 group-hover:opacity-100'
      }`}>
        {isSelected ? '✎ Editing' : '✎ Edit'}
      </span>
      {children}
    </div>
  )
}

// ─── Section canvases ────────────────────────────────────────────────────────────

interface CanvasProps {
  items: WebPageItem[]
  selected: WebPageItem | null
  onSelect: (item: WebPageItem) => void
  onRequestDelete?: (item: WebPageItem) => void
  onAddNew: () => void
  isLoading: boolean
  onFieldFocus?: (item: WebPageItem, fieldKey: string) => void
  focusedField?: string | null
}

function HeroCanvas({ items, selected, onSelect, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-8">
      {isLoading && <ProgressBar />}
      {displayItems.length === 0 && (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
          <p className="text-sm font-semibold text-stone-900">No hero blocks yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500">
            Add a hero block here to display the DreamBuild landing page hero from CMS records.
          </p>
          <div className="mx-auto mt-5 max-w-xs">
            <AddNewButton onClick={onAddNew} label="Add hero block" />
          </div>
        </div>
      )}
      {displayItems.map(item => {
        const p = (item.payload ?? {}) as Record<string, string>
        const imgs = cleanHeroCarouselImages(p.carousel_images ?? '').split('\n').filter(Boolean)
        const stats = [1, 2, 3].map(n => ({ v: p[`stat_${n}_value`], l: p[`stat_${n}_label`] })).filter(s => s.v || s.l)
        const isThisSelected = selected?.id === item.id
        const fz = (fieldKey: string) => ({
          fieldKey,
          label: fieldKey.replace(/_/g, ' '),
          onFocus: (key: string) => onFieldFocus?.(item, key),
          isActive: isThisSelected && focusedField === fieldKey,
        })
        return (
          <CanvasItem key={item.id} item={item} selected={selected} onSelect={onSelect}>
            <div className="overflow-hidden rounded-3xl bg-white shadow-md">
              <div className="grid gap-10 p-8 lg:grid-cols-[1fr_340px] lg:items-center">
                <div>
                  <FieldZone {...fz('eyebrow')}>
                    <span className="inline-block rounded-full border border-stone-200 bg-white px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500">
                      {p.eyebrow || <em className="font-normal text-stone-300">Eyebrow text</em>}
                    </span>
                  </FieldZone>
                  <FieldZone {...fz('title')} label="Title">
                    <h2 className="mt-5 text-2xl font-medium leading-snug text-stone-900 lg:text-3xl">
                      {item.title || <em className="font-normal text-stone-300">Headline goes here…</em>}
                    </h2>
                  </FieldZone>
                  <FieldZone {...fz('body')} label="Body">
                    {item.body ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-500">{item.body}</p>
                    ) : null}
                  </FieldZone>
                  <FieldZone {...fz('primary_button_text')} label="Primary CTA">
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white">
                        {p.primary_button_text || 'Primary CTA'}
                      </span>
                      <span className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700">
                        {p.secondary_button_text || 'Secondary CTA'}
                      </span>
                    </div>
                  </FieldZone>
                  {stats.length > 0 && (
                    <FieldZone {...fz('stat_1_value')} label="Stats">
                      <div className="mt-8 grid grid-cols-3 gap-4 border-t border-stone-100 pt-6">
                        {stats.map((s, i) => (
                          <div key={i}>
                            <p className="text-xl font-medium text-stone-900">{s.v}</p>
                            <p className="mt-0.5 text-[10px] text-stone-400">{s.l}</p>
                          </div>
                        ))}
                      </div>
                    </FieldZone>
                  )}
                </div>
                <FieldZone {...fz('carousel_images')} label="Carousel image">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100">
                    {imgs[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
                      : <div className="flex h-full items-center justify-center"><p className="text-sm text-stone-400">Carousel image</p></div>
                    }
                    {imgs.length > 1 && (
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {imgs.map((_, i) => (
                          <span key={i} className={`block h-1 rounded-full bg-white/80 ${i === 0 ? 'w-4' : 'w-1.5 opacity-50'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </FieldZone>
              </div>
            </div>
          </CanvasItem>
        )
      })}
      {/* Hero is a singleton section — no "add another" once one exists. */}
    </div>
  )
}

function ServicesCanvas({ items, selected, onSelect, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = [...items]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
  const headerItem = displayItems[0]
  const headerPayload = (headerItem?.payload ?? {}) as Record<string, string>
  const sectionEyebrow = headerPayload.section_eyebrow || SERVICES_HEADER_DEFAULTS.eyebrow
  const sectionTitle = headerPayload.section_title || SERVICES_HEADER_DEFAULTS.title
  const sectionDescription = headerPayload.section_description || SERVICES_HEADER_DEFAULTS.description
  const ctaSourcePayload = (displayItems.find(item => {
    const payload = (item.payload ?? {}) as Record<string, string>
    return Boolean(payload.cta_text || payload.cta_button_text || item.button_text)
  })?.payload ?? {}) as Record<string, string>
  const ctaButtonSource = displayItems.find(item => item.button_text)?.button_text
  const ctaText = ctaSourcePayload.cta_text || SERVICES_CTA_DEFAULTS.text
  const ctaButtonText = ctaSourcePayload.cta_button_text || ctaButtonSource || SERVICES_CTA_DEFAULTS.buttonText
  const sharedServiceLabel =
    displayItems
      .map(item => ((item.payload ?? {}) as Record<string, string>).service_label)
      .find(Boolean) || 'Solution'
  const headerItemWithDefaults: WebPageItem | null = headerItem
    ? {
      ...headerItem,
      payload: {
        ...headerPayload,
        section_eyebrow: sectionEyebrow,
        section_title: sectionTitle,
        section_description: sectionDescription,
        cta_text: ctaText,
        cta_button_text: ctaButtonText,
      },
    }
    : null
  const headerField = (fieldKey: string, label: string) => ({
    fieldKey,
    label,
    onFocus: (key: string) => headerItemWithDefaults && onFieldFocus?.(headerItemWithDefaults, key),
    isActive: selected?.id === headerItem?.id && focusedField === fieldKey,
  })

  return (
    <div className="mx-auto max-w-4xl p-8">
      {isLoading && <ProgressBar />}

      {/* Section header — mirrors landing page */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <FieldZone {...headerField('section_eyebrow', 'Section eyebrow')}>
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">
              <span className="h-px w-8 bg-stone-300" />
              {sectionEyebrow}
            </p>
          </FieldZone>
          <FieldZone {...headerField('section_title', 'Section title')}>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-stone-900">
              {sectionTitle}
            </h2>
          </FieldZone>
        </div>
        <FieldZone {...headerField('section_description', 'Section description')}>
          <p className="max-w-xs text-sm leading-relaxed text-stone-500 lg:text-right">
            {sectionDescription}
          </p>
        </FieldZone>
      </div>

      {/* Service items */}
      <div className="mt-14 space-y-20">
        {displayItems.map((item, idx) => {
          const p = (item.payload ?? {}) as Record<string, string>
          const bullets = (p.bullets ?? '').split('\n').filter(Boolean)
          const isEven = idx % 2 === 1
          const serviceLabel = p.service_label || sharedServiceLabel
          const serviceNum = String(idx + 1).padStart(2, '0')
          const itemForEditing: WebPageItem = {
            ...item,
            sort_order: idx,
            payload: {
              ...p,
              service_label: serviceLabel,
              service_number: serviceNum,
            },
          }
          const imgSrc = item.image_url || SERVICE_IMAGES[idx % SERVICE_IMAGES.length]
          const isThisSelected = selected?.id === item.id
          const fz = (fieldKey: string, label: string) => ({
            fieldKey,
            label,
            onFocus: (key: string) => onFieldFocus?.(itemForEditing, key),
            isActive: isThisSelected && focusedField === fieldKey,
          })

          return (
            <CanvasItem key={item.id} item={itemForEditing} selected={selected} onSelect={onSelect}>
              <div className="relative">
                {/* Oversized background number */}
                <div className={`pointer-events-none absolute -top-8 select-none text-[7rem] font-bold leading-none tracking-tighter text-stone-200 ${isEven ? 'right-0' : 'left-0'}`}>
                  {serviceNum}
                </div>

                <div className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
                  {isEven ? (
                    <>
                      <div className="flex flex-col justify-center">
                        <p className="flex w-fit items-center gap-1 text-xs font-medium uppercase tracking-widest text-stone-400">
                          <FieldZone {...fz('service_label', 'Service label')}>
                            <span>{serviceLabel}</span>
                          </FieldZone>
                          <FieldZone {...fz('service_number', 'Service #')}>
                            <span>{serviceNum}</span>
                          </FieldZone>
                        </p>
                        <FieldZone {...fz('title', 'Title')}>
                          <h3 className="mt-4 text-2xl font-medium tracking-tight text-stone-900 lg:text-3xl">
                            {item.title || <em className="font-normal text-stone-300">Service title…</em>}
                          </h3>
                        </FieldZone>
                        <FieldZone {...fz('body', 'Body')}>
                          {(item.body ?? item.subtitle) ? (
                            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-500">{item.body ?? item.subtitle}</p>
                          ) : null}
                        </FieldZone>
                        <div className="my-6 h-px w-10 bg-stone-200" />
                        <FieldZone {...fz('bullets', 'Bullets')}>
                          {bullets.length > 0 && (
                            <div className="space-y-3">
                              {bullets.slice(0, 4).map((b, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-[10px] font-medium text-stone-700">
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <p className="pt-0.5 text-sm leading-relaxed text-stone-500">{b}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </FieldZone>
                      </div>
                      <FieldZone {...fz('image_url', 'Image')}>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgSrc} alt={item.title ?? ''} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                          <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm">
                            <span className="text-sm font-bold tracking-tight text-stone-900">{serviceNum}</span>
                          </div>
                        </div>
                      </FieldZone>
                    </>
                  ) : (
                    <>
                      <FieldZone {...fz('image_url', 'Image')}>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgSrc} alt={item.title ?? ''} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                          <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm">
                            <span className="text-sm font-bold tracking-tight text-stone-900">{serviceNum}</span>
                          </div>
                        </div>
                      </FieldZone>
                      <div className="flex flex-col justify-center">
                        <p className="flex w-fit items-center gap-1 text-xs font-medium uppercase tracking-widest text-stone-400">
                          <FieldZone {...fz('service_label', 'Service label')}>
                            <span>{serviceLabel}</span>
                          </FieldZone>
                          <FieldZone {...fz('service_number', 'Service #')}>
                            <span>{serviceNum}</span>
                          </FieldZone>
                        </p>
                        <FieldZone {...fz('title', 'Title')}>
                          <h3 className="mt-4 text-2xl font-medium tracking-tight text-stone-900 lg:text-3xl">
                            {item.title || <em className="font-normal text-stone-300">Service title…</em>}
                          </h3>
                        </FieldZone>
                        <FieldZone {...fz('body', 'Body')}>
                          {(item.body ?? item.subtitle) ? (
                            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-500">{item.body ?? item.subtitle}</p>
                          ) : null}
                        </FieldZone>
                        <div className="my-6 h-px w-10 bg-stone-200" />
                        <FieldZone {...fz('bullets', 'Bullets')}>
                          {bullets.length > 0 && (
                            <div className="space-y-3">
                              {bullets.slice(0, 4).map((b, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-[10px] font-medium text-stone-700">
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <p className="pt-0.5 text-sm leading-relaxed text-stone-500">{b}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </FieldZone>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CanvasItem>
          )
        })}
      </div>

      {/* Bottom CTA — mirrors landing page */}
      <div className="mt-16 flex flex-col items-center gap-4 border-t border-stone-200 pt-12 text-center">
        <FieldZone {...headerField('cta_text', 'CTA text')}>
          <p className="text-base font-medium text-stone-900">
            {ctaText}
          </p>
        </FieldZone>
        <FieldZone {...headerField('cta_button_text', 'CTA button text')}>
          <span className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-8 py-3.5 text-sm font-medium text-white">
            {ctaButtonText} -&gt;
          </span>
        </FieldZone>
      </div>

      <AddNewButton onClick={onAddNew} label="Add service" />
    </div>
  )
}

function ProjectsCanvas({ items, selected, onSelect, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
  const headerItem = displayItems.find(isProjectsHeaderItem)
  const headerPayload = (headerItem?.payload ?? {}) as Record<string, string>
  const sectionEyebrow = headerPayload.section_eyebrow || PROJECTS_HEADER_DEFAULTS.eyebrow
  const sectionTitle = headerPayload.section_title || PROJECTS_HEADER_DEFAULTS.title
  const headerItemWithDefaults: WebPageItem = {
    id: headerItem?.id ?? -1002,
    type: 'dreambuild-projects',
    key: PROJECTS_HEADER_KEY,
    sort_order: headerItem?.sort_order ?? 0,
    is_active: headerItem?.is_active ?? true,
    title: headerItem?.title ?? null,
    subtitle: headerItem?.subtitle ?? null,
    body: headerItem?.body ?? null,
    image_url: headerItem?.image_url ?? null,
    link_url: headerItem?.link_url ?? null,
    button_text: headerItem?.button_text ?? null,
    payload: {
      ...headerPayload,
      section_eyebrow: sectionEyebrow,
      section_title: sectionTitle,
    },
  }
  const projectItems = displayItems.filter(item => !isProjectsHeaderItem(item))
  const headerField = (fieldKey: string, label: string) => ({
    fieldKey,
    label,
    onFocus: (key: string) => onFieldFocus?.(headerItemWithDefaults, key),
    isActive: selected?.id === headerItem?.id && focusedField === fieldKey,
  })
  const bentoClass = [
    'lg:col-span-1 lg:row-span-2',
    'lg:col-span-1 lg:row-span-1',
    'lg:col-span-1 lg:row-span-2',
    'lg:col-span-1 lg:row-span-1',
  ]
  const aspectClass = [
    'aspect-[3/4] lg:aspect-auto lg:h-full',
    'aspect-[4/3]',
    'aspect-[3/4] lg:aspect-auto lg:h-full',
    'aspect-[4/3]',
  ]

  return (
    <div className="mx-auto max-w-5xl p-8">
      {isLoading && <ProgressBar />}
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-stone-200 pb-6">
        <div>
          <FieldZone {...headerField('section_eyebrow', 'Section eyebrow')}>
            <p className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-stone-500">
              <span className="h-px w-8 bg-stone-400" />
              {sectionEyebrow}
            </p>
          </FieldZone>
          <FieldZone {...headerField('section_title', 'Section title')}>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-stone-950">
              {sectionTitle}
            </h2>
          </FieldZone>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
        >
          <span className="text-base leading-none">+</span>
          Add Project
        </button>
      </div>
      {projectItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
          <p className="text-sm font-semibold text-stone-900">No featured projects yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500">
            Add project case studies here. Only saved CMS project records will appear on DreamBuild.
          </p>
          <button
            type="button"
            onClick={onAddNew}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
          >
            <span className="text-base leading-none">+</span>
            Add First Project
          </button>
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:gap-4">
        {projectItems.map((item, index) => {
          const p = (item.payload ?? {}) as Record<string, string>
          const isThisSelected = selected?.id === item.id
          const fz = (fieldKey: string, label: string) => ({
            fieldKey,
            label,
            onFocus: (key: string) => onFieldFocus?.(item, key),
            isActive: isThisSelected && focusedField === fieldKey,
          })
          const layoutIndex = index % bentoClass.length
          return (
            <div key={item.id} className={bentoClass[layoutIndex]}>
              <CanvasItem item={item} selected={selected} onSelect={onSelect}>
                <div className="group relative h-full overflow-hidden rounded-2xl bg-stone-200 shadow-sm">
                  <FieldZone {...fz('image_url', 'Image')}>
                    <div className={`relative w-full overflow-hidden ${aspectClass[layoutIndex]}`}>
                      {item.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        : <div className="flex h-full min-h-56 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200"><p className="text-xs text-stone-400">No image</p></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
                      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/20 backdrop-blur-sm">
                        <span className="text-xs font-bold text-white">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <FieldZone {...fz('tag', 'Tag')}>
                          {p.tag && <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/70">{p.tag}</p>}
                        </FieldZone>
                        <FieldZone {...fz('title', 'Title')}>
                          <h3 className="text-base font-semibold leading-snug text-white">{item.title || 'Untitled project'}</h3>
                        </FieldZone>
                      </div>
                    </div>
                  </FieldZone>
                </div>
              </CanvasItem>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TestimonialsCanvas({ items, selected, onSelect, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = items
  return (
    <div className="mx-auto max-w-4xl p-8">
      {isLoading && <ProgressBar />}
      <div className="grid gap-4 md:grid-cols-2">
        {displayItems.map(item => {
          const p = (item.payload ?? {}) as Record<string, string>
          const name = p.client_name || item.title
          const isThisSelected = selected?.id === item.id
          const fz = (fieldKey: string, label: string) => ({
            fieldKey,
            label,
            onFocus: (key: string) => onFieldFocus?.(item, key),
            isActive: isThisSelected && focusedField === fieldKey,
          })
          return (
            <CanvasItem key={item.id} item={item} selected={selected} onSelect={onSelect}>
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-3xl leading-none text-stone-200">&quot;</p>
                <FieldZone {...fz('body', 'Quote')}>
                  <p className="mt-2 line-clamp-4 text-sm italic leading-relaxed text-stone-700">
                    {item.body ?? item.subtitle}
                  </p>
                </FieldZone>
                <div className="mt-4 flex items-center gap-3 border-t border-stone-100 pt-4">
                  <FieldZone {...fz('image_url', 'Photo')}>
                    {item.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={item.image_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100"><span className="text-xs font-semibold text-stone-500">{name?.[0]?.toUpperCase() ?? '?'}</span></div>
                    }
                  </FieldZone>
                  <div>
                    <FieldZone {...fz('client_name', 'Name')}>
                      <p className="text-sm font-semibold text-stone-900">{name}</p>
                    </FieldZone>
                    <FieldZone {...fz('client_role', 'Role')}>
                      <p className="text-xs text-stone-400">{p.client_role}</p>
                    </FieldZone>
                  </div>
                </div>
              </div>
            </CanvasItem>
          )
        })}
      </div>
      <AddNewButton onClick={onAddNew} label="Add testimonial" />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProcessCanvas({ items, selected, onSelect, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = items
  return (
    <div className="mx-auto max-w-4xl p-8">
      {isLoading && <ProgressBar />}
      <div className="grid gap-4 md:grid-cols-3">
        {displayItems.map((item, idx) => {
          const p = (item.payload ?? {}) as Record<string, string>
          const isThisSelected = selected?.id === item.id
          const fz = (fieldKey: string, label: string) => ({
            fieldKey,
            label,
            onFocus: (key: string) => onFieldFocus?.(item, key),
            isActive: isThisSelected && focusedField === fieldKey,
          })
          return (
            <CanvasItem key={item.id} item={item} selected={selected} onSelect={onSelect}>
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <FieldZone {...fz('step_number', 'Step #')}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-stone-900">
                    <span className="text-sm font-bold text-stone-900">{p.step_number || String(idx + 1).padStart(2, '0')}</span>
                  </div>
                </FieldZone>
                <FieldZone {...fz('title', 'Title')}>
                  <h3 className="mt-4 font-semibold text-stone-900">{item.title}</h3>
                </FieldZone>
                <FieldZone {...fz('body', 'Body')}>
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-stone-500">{item.body ?? item.subtitle}</p>
                </FieldZone>
              </div>
            </CanvasItem>
          )
        })}
      </div>
      <AddNewButton onClick={onAddNew} label="Add process step" />
    </div>
  )
}

function ContactCanvas({ items, selected, onSelect, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = items
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-8">
      {isLoading && <ProgressBar />}
      {displayItems.map(item => {
        const p = (item.payload ?? {}) as Record<string, string>
        const isThisSelected = selected?.id === item.id
        const fz = (fieldKey: string, label: string) => ({
          fieldKey,
          label,
          onFocus: (key: string) => onFieldFocus?.(item, key),
          isActive: isThisSelected && focusedField === fieldKey,
        })
        return (
          <CanvasItem key={item.id} item={item} selected={selected} onSelect={onSelect}>
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <FieldZone {...fz('title', 'Title')}>
                <h3 className="text-xl font-medium text-stone-900">{item.title}</h3>
              </FieldZone>
              <FieldZone {...fz('body', 'Body')}>
                {(item.body ?? item.subtitle) ? (
                  <p className="mt-2 text-sm text-stone-500">{item.body ?? item.subtitle}</p>
                ) : null}
              </FieldZone>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FieldZone {...fz('email', 'Email')}>
                  {p.email && (
                    <div className="rounded-xl bg-stone-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Email</p>
                      <p className="mt-1 text-sm text-stone-700">{p.email}</p>
                    </div>
                  )}
                </FieldZone>
                <FieldZone {...fz('phone', 'Phone / Viber')}>
                  {p.phone && (
                    <div className="rounded-xl bg-stone-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Phone / Viber</p>
                      <p className="mt-1 text-sm text-stone-700">{p.phone}</p>
                    </div>
                  )}
                </FieldZone>
                <FieldZone {...fz('address', 'Location')}>
                  {p.address && (
                    <div className="rounded-xl bg-stone-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Location</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{p.address}</p>
                    </div>
                  )}
                </FieldZone>
                <FieldZone {...fz('response_time', 'Response Time')}>
                  {p.response_time && (
                    <div className="rounded-xl bg-stone-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Response Time</p>
                      <p className="mt-1 text-sm text-stone-700">{p.response_time}</p>
                    </div>
                  )}
                </FieldZone>
                <FieldZone {...fz('status_badge', 'Status badge')}>
                  {p.status_badge && (
                    <div className="rounded-xl bg-stone-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Status badge</p>
                      <p className="mt-1 text-sm text-stone-700">{p.status_badge}</p>
                    </div>
                  )}
                </FieldZone>
              </div>
            </div>
          </CanvasItem>
        )
      })}
      <AddNewButton onClick={onAddNew} label="Add contact block" />
    </div>
  )
}

function BlogsCanvas({ items, selected, onSelect, onRequestDelete, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = items

  return (
    <div className="mx-auto max-w-5xl p-8">
      {isLoading && <ProgressBar />}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-stone-300/60 pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">Editorial Library</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">Blogs</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-500">
            Manage CMS article records. The public landing page keeps its static fallback until CMS rows are added here.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
        >
          <span className="text-base leading-none">+</span>
          Add Blog Post
        </button>
      </div>

      {displayItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
          <p className="text-sm font-semibold text-stone-900">No CMS blog posts yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500">
            DreamBuild will keep using the static blog content from the landing page. Add a CMS post when you want to replace a fallback slot.
          </p>
          <button
            type="button"
            onClick={onAddNew}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
          >
            <span className="text-base leading-none">+</span>
            Add First Blog Post
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(0,1.6fr)_130px_110px_100px_190px] gap-4 border-b border-stone-100 bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">
            <span>Article</span>
            <span>Category</span>
            <span>Date</span>
            <span>Read</span>
            <span className="text-right">Action</span>
          </div>
          {displayItems.map(item => {
            const p = (item.payload ?? {}) as Record<string, string>
            const isThisSelected = selected?.id === item.id
            const fz = (fieldKey: string, label: string) => ({
              fieldKey,
              label,
              onFocus: (key: string) => onFieldFocus?.(item, key),
              isActive: isThisSelected && focusedField === fieldKey,
            })

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(item)
                  }
                }}
                className={`group grid w-full cursor-pointer grid-cols-[minmax(0,1.6fr)_130px_110px_100px_190px] items-center gap-4 border-b border-stone-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-stone-50 ${
                  isThisSelected ? 'bg-cyan-50/50' : ''
                }`}
              >
                <div className="min-w-0">
                  <FieldZone {...fz('title', 'Title')}>
                    <p className="truncate text-sm font-semibold text-stone-950">{item.title || 'Untitled article'}</p>
                  </FieldZone>
                  <FieldZone {...fz('subtitle', 'Excerpt')}>
                    <p className="mt-1 line-clamp-1 text-xs text-stone-500">{item.subtitle || item.body || 'No excerpt yet'}</p>
                  </FieldZone>
                </div>
                <FieldZone {...fz('category', 'Category')}>
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{p.category || 'Uncategorized'}</p>
                </FieldZone>
                <FieldZone {...fz('date', 'Date')}>
                  <p className="text-xs text-stone-500">{p.date || 'No date'}</p>
                </FieldZone>
                <FieldZone {...fz('read_time', 'Read time')}>
                  <p className="text-xs text-stone-500">{p.read_time || 'No time'}</p>
                </FieldZone>
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                    CMS
                  </span>
                  {item.id > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRequestDelete?.(item)
                      }}
                      className="shrink-0 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-[11px] font-bold text-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm"
                      title="Delete this blog post"
                    >
                      Delete
                    </button>
                  )}
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-stone-950 px-3.5 py-1.5 text-[11px] font-bold text-white transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-sm">Edit</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GalleryCanvas({ items, selected, onSelect, onRequestDelete, onAddNew, isLoading, onFieldFocus, focusedField }: CanvasProps) {
  const displayItems = items
  const headerItem = displayItems[0]
  const headerPayload = (headerItem?.payload ?? {}) as Record<string, string>
  const sectionEyebrow = headerPayload.section_eyebrow || GALLERY_HEADER_DEFAULTS.eyebrow
  const sectionTitle = headerPayload.section_title || GALLERY_HEADER_DEFAULTS.title
  const ctaText = headerPayload.cta_text || GALLERY_HEADER_DEFAULTS.ctaText
  const headerItemWithDefaults: WebPageItem | null = headerItem
    ? {
      ...headerItem,
      payload: {
        ...headerPayload,
        section_eyebrow: sectionEyebrow,
        section_title: sectionTitle,
        cta_text: ctaText,
      },
    }
    : null
  const headerField = (fieldKey: string, label: string) => ({
    fieldKey,
    label,
    onFocus: (key: string) => headerItemWithDefaults && onFieldFocus?.(headerItemWithDefaults, key),
    isActive: selected?.id === headerItem?.id && focusedField === fieldKey,
  })
  return (
    <div className="mx-auto max-w-5xl p-8">
      {isLoading && <ProgressBar />}
      <div className="mb-8 flex flex-col gap-6 border-b border-stone-300/60 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <FieldZone {...headerField('section_eyebrow', 'Section eyebrow')}>
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-500">
              <span className="h-px w-8 bg-stone-400" />
              {sectionEyebrow}
            </p>
          </FieldZone>
          <FieldZone {...headerField('section_title', 'Section title')}>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-stone-950">
              {sectionTitle}
            </h2>
          </FieldZone>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <FieldZone {...headerField('cta_text', 'Header button text')}>
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-900">
              {ctaText}
              <span>-&gt;</span>
            </span>
          </FieldZone>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
          >
            <span className="text-base leading-none">+</span>
            Add Image
          </button>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
          <p className="text-sm font-semibold text-stone-900">No gallery images yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500">
            Add images here to build the gallery shown on the DreamBuild landing page.
          </p>
          <button
            type="button"
            onClick={onAddNew}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
          >
            <span className="text-base leading-none">+</span>
            Add First Gallery Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {displayItems.map((item) => {
          const p = (item.payload ?? {}) as Record<string, string>
          const imageUrl = item.image_url || ''
          const title = item.title || 'Untitled image'
          const alt = p.alt || title
          const description = p.description || 'Add a short description'
          const address = p.address || 'Add address'
          const isThisSelected = selected?.id === item.id
          const fz = (fieldKey: string, label: string) => ({
            fieldKey,
            label,
            onFocus: (key: string) => onFieldFocus?.(item, key),
            isActive: isThisSelected && focusedField === fieldKey,
          })

          return (
            <CanvasItem key={item.id} item={item} selected={selected} onSelect={onSelect}>
              <div className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <FieldZone {...fz('image_url', 'Image')}>
                  <div className="relative aspect-square overflow-hidden">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-cyan-50 text-center text-xs font-semibold text-cyan-700">
                        <span className="text-2xl leading-none">+</span>
                        Upload image
                      </div>
                    )}
                    {item.id < 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-cyan-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        Draft
                      </span>
                    )}
                  </div>
                </FieldZone>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <FieldZone {...fz('title', 'Title')}>
                        <p className="truncate text-sm font-semibold text-stone-900">{title}</p>
                      </FieldZone>
                      <FieldZone {...fz('description', 'Description')}>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-400">{description}</p>
                      </FieldZone>
                      <FieldZone {...fz('address', 'Address')}>
                        <p className="mt-1 text-[11px] font-medium text-stone-500">{address}</p>
                      </FieldZone>
                    </div>

                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(item)
                      }}
                      className="rounded-full bg-stone-950 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-stone-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRequestDelete?.(item)
                      }}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </CanvasItem>
          )
        })}
        </div>
      )}
    </div>
  )
}

function SectionCanvas(props: CanvasProps & { section: DreamBuildSection }) {
  switch (props.section.id) {
    case 'dreambuild-hero': return <HeroCanvas {...props} />
    case 'dreambuild-services': return <ServicesCanvas {...props} />
    case 'dreambuild-projects': return <ProjectsCanvas {...props} />
    case 'dreambuild-blogs': return <BlogsCanvas {...props} />
    case 'dreambuild-testimonials': return <TestimonialsCanvas {...props} />
    case 'dreambuild-gallery': return <GalleryCanvas {...props} />
    case 'dreambuild-process': return <ProcessCanvas {...props} />
    case 'dreambuild-contact': return <ContactCanvas {...props} />
    default: return null
  }
}

// ─── Carousel images field ──────────────────────────────────────────────────────

function CarouselImagesField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  // Internal slots array — keeps empty strings alive so new rows persist
  const [slots, setSlots] = useState<string[]>(() => {
    const parsed = (value ?? '').split('\n').filter(Boolean)
    return parsed.length > 0 ? parsed : ['']
  })
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  // Track last value we wrote so external resets (different item selected) are detected
  const lastWritten = useRef((value ?? '').split('\n').filter(Boolean).join('\n'))
  useEffect(() => {
    const incoming = (value ?? '').split('\n').filter(Boolean).join('\n')
    if (incoming === lastWritten.current) return
    lastWritten.current = incoming
    const parsed = incoming.split('\n').filter(Boolean)
    setSlots(parsed.length > 0 ? parsed : [''])
  }, [value])

  const commit = (next: string[]) => {
    setSlots(next)
    const serialized = next.filter(Boolean).join('\n')
    lastWritten.current = serialized
    onChange(serialized)
  }

  const updateUrl = (idx: number, url: string) => {
    const next = [...slots]
    next[idx] = url
    commit(next)
  }

  const removeUrl = (idx: number) => {
    const next = slots.filter((_, i) => i !== idx)
    commit(next.length > 0 ? next : [''])
  }

  const uploadForSlot = async (idx: number, file: File) => {
    setUploadingIdx(idx)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'web-content')
      fd.append('asset_type', 'image')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const result = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !result.url) throw new Error(result.error ?? 'Upload failed')
      updateUrl(idx, result.url)
      showSuccessToast('Image uploaded.')
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingIdx(null)
    }
  }

  return (
    <div className="space-y-3">
      {slots.map((url, idx) => (
        <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Preview */}
          {url ? (
            <div className="relative h-32 overflow-hidden bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
                Image {idx + 1}
              </span>
            </div>
          ) : (
            <div className="flex h-14 items-center justify-center bg-stone-100">
              <span className="text-[10px] text-stone-400">Image {idx + 1} — paste URL or upload</span>
            </div>
          )}
          {/* Controls row */}
          <div className="space-y-2 p-3">
            <input
              value={url}
              onChange={e => updateUrl(idx, e.target.value)}
              placeholder="https://..."
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-100"
            />
            <div className="flex flex-wrap items-center gap-2">
            {/* Upload */}
            <label className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              uploadingIdx === idx
                ? 'cursor-wait border-cyan-200 bg-cyan-50 text-cyan-400'
                : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-white'
            }`} title="Upload image">
              {uploadingIdx === idx ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-300 border-t-cyan-600" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                </svg>
              )}
              <span>{uploadingIdx === idx ? 'Uploading...' : url ? 'Replace' : 'Upload'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploadingIdx !== null}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void uploadForSlot(idx, file)
                  e.currentTarget.value = ''
                }}
              />
            </label>
            {/* Remove */}
            <button
              type="button"
              onClick={() => removeUrl(idx)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-100"
              title="Remove image"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Remove</span>
            </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...slots, ''])}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
      >
        <span className="text-base leading-none">+</span>
        Add image
      </button>
    </div>
  )
}

// ─── Edit panel ─────────────────────────────────────────────────────────────────

function RepeatableTextListField({
  value,
  onChange,
  dataField,
  addLabel,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  dataField: string
  addLabel: string
  placeholder: string
}) {
  const [slots, setSlots] = useState<string[]>(() => {
    const parsed = (value ?? '').split('\n').filter(Boolean)
    return parsed.length > 0 ? parsed : ['']
  })
  const lastWritten = useRef((value ?? '').split('\n').filter(Boolean).join('\n'))

  useEffect(() => {
    const incoming = (value ?? '').split('\n').filter(Boolean).join('\n')
    if (incoming === lastWritten.current) return
    lastWritten.current = incoming
    const parsed = incoming.split('\n').filter(Boolean)
    setSlots(parsed.length > 0 ? parsed : [''])
  }, [value])

  const commit = (next: string[]) => {
    setSlots(next)
    const serialized = next.map(item => item.trim()).filter(Boolean).join('\n')
    lastWritten.current = serialized
    onChange(serialized)
  }

  return (
    <div data-field={dataField} className="space-y-2">
      {slots.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-400">
            {idx + 1}
          </span>
          <textarea
            value={item}
            onChange={e => {
              const next = [...slots]
              next[idx] = e.target.value
              commit(next)
            }}
            rows={2}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-100"
          />
          <button
            type="button"
            onClick={() => {
              const next = slots.filter((_, i) => i !== idx)
              commit(next.length > 0 ? next : [''])
            }}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-400 transition hover:bg-red-100"
            title="Remove item"
          >
            x
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...slots, ''])}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-xs font-semibold text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
      >
        <span className="text-base leading-none">+</span>
        {addLabel}
      </button>
    </div>
  )
}

type ArticleSectionRow = {
  heading: string
  body: string
}

const parseArticleSectionRows = (value: string): ArticleSectionRow[] => {
  const rows = (value ?? '')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const divider = line.indexOf('|')
      if (divider === -1) return { heading: line.trim(), body: '' }
      return {
        heading: line.slice(0, divider).trim(),
        body: line.slice(divider + 1).trim(),
      }
    })

  return rows.length > 0 ? rows : [{ heading: '', body: '' }]
}

function RepeatableArticleSectionsField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [rows, setRows] = useState<ArticleSectionRow[]>(() => parseArticleSectionRows(value))
  const lastWritten = useRef(
    parseArticleSectionRows(value)
      .filter(row => row.heading || row.body)
      .map(row => `${row.heading}|${row.body}`)
      .join('\n'),
  )

  useEffect(() => {
    const incoming = parseArticleSectionRows(value)
      .filter(row => row.heading || row.body)
      .map(row => `${row.heading}|${row.body}`)
      .join('\n')
    if (incoming === lastWritten.current) return
    lastWritten.current = incoming
    setRows(parseArticleSectionRows(value))
  }, [value])

  const commit = (next: ArticleSectionRow[]) => {
    setRows(next)
    const serialized = next
      .map(row => ({ heading: row.heading.trim(), body: row.body.trim() }))
      .filter(row => row.heading || row.body)
      .map(row => `${row.heading}|${row.body}`)
      .join('\n')
    lastWritten.current = serialized
    onChange(serialized)
  }

  return (
    <div data-field="sections" className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Section {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = rows.filter((_, i) => i !== idx)
                commit(next.length > 0 ? next : [{ heading: '', body: '' }])
              }}
              className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-500 transition hover:bg-red-100"
            >
              Remove
            </button>
          </div>
          <div className="space-y-2">
            <input
              value={row.heading}
              onChange={e => {
                const next = [...rows]
                next[idx] = { ...next[idx], heading: e.target.value }
                commit(next)
              }}
              placeholder="Section heading"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-100"
            />
            <textarea
              value={row.body}
              onChange={e => {
                const next = [...rows]
                next[idx] = { ...next[idx], body: e.target.value }
                commit(next)
              }}
              rows={3}
              placeholder="Section body"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-100"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...rows, { heading: '', body: '' }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
      >
        <span className="text-base leading-none">+</span>
        Add section
      </button>
    </div>
  )
}

function EditPanel({
  section, form, setForm, editTarget, isBusy, onSubmit, onDelete, onCancel,
  focusedField, onUploadImage, isUploadingImage, serviceItems, onServiceTabSelect, isSaveDisabled,
}: {
  section: DreamBuildSection
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editTarget: WebPageItem | null
  isBusy: boolean
  isSaveDisabled: boolean
  onSubmit: (e: FormEvent) => void
  onDelete: () => void
  onCancel: () => void
  focusedField?: string | null
  onUploadImage?: (file: File) => Promise<void>
  isUploadingImage?: boolean
  serviceItems?: WebPageItem[]
  onServiceTabSelect?: (item: WebPageItem) => void
}) {
  const isCreatingFromStatic = !editTarget
  const isServices = section.id === 'dreambuild-services'
  const isGallery = section.id === 'dreambuild-gallery'
  const isProjectsHeaderEdit =
    section.id === 'dreambuild-projects' &&
    (form.key === PROJECTS_HEADER_KEY || editTarget?.key === PROJECTS_HEADER_KEY)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const heroCtaFields = ['primary_button_text', 'secondary_button_text']
  const isHeroStatsFocus = section.id === 'dreambuild-hero' && Boolean(focusedField?.startsWith('stat_'))
  const isHeroCtaFocus = section.id === 'dreambuild-hero' && Boolean(focusedField && heroCtaFields.includes(focusedField))
  const shouldShowField = () => true
  const sectionFieldsToRender = section.fields.filter(field => {
    if (section.id !== 'dreambuild-projects') return true
    const isHeaderField = PROJECTS_HEADER_FIELDS.includes(field.key)
    return isProjectsHeaderEdit ? isHeaderField : !isHeaderField
  })
  const focusedFieldLabel = isHeroStatsFocus
    ? 'stats'
    : isHeroCtaFocus
      ? 'buttons'
      : focusedField?.replace(/_/g, ' ')

  useEffect(() => {
    if (!focusedField || !scrollAreaRef.current) return
    const el = scrollAreaRef.current.querySelector<HTMLElement>(`[data-field="${focusedField}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    // Slight delay so scroll completes before focusing
    setTimeout(() => el.querySelector<HTMLElement>('input, textarea, select')?.focus(), 150)
  }, [focusedField])

  if (section.id === 'dreambuild-blogs') {
    return (
      <BlogEditPanel
        section={section}
        form={form}
        setForm={setForm}
        editTarget={editTarget}
        isBusy={isBusy}
        isSaveDisabled={isSaveDisabled}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onCancel}
        focusedField={focusedField}
        onUploadImage={onUploadImage}
        isUploadingImage={isUploadingImage}
      />
    )
  }

  if (section.id === 'dreambuild-process') {
    return (
      <ProcessEditPanel
        form={form}
        setForm={setForm}
        editTarget={editTarget}
        isBusy={isBusy}
        isSaveDisabled={isSaveDisabled}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onCancel}
        focusedField={focusedField}
      />
    )
  }

  const updatePayloadField = (key: string, value: string) => {
    setForm(p => ({ ...p, payload: { ...p.payload, [key]: value } }))
  }

  const renderImageField = (label = 'Image') => (
    <Field label={label} fieldKey="image_url" focusedField={focusedField}>
      <input
        data-field="image_url"
        value={form.image_url}
        onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
        placeholder="Paste URL or upload below"
        className={inputClass}
      />
      <label className={`mt-1.5 inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition ${
        isUploadingImage
          ? 'cursor-wait border-cyan-200 bg-cyan-50 text-cyan-500'
          : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-white'
      }`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
        </svg>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={isUploadingImage}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onUploadImage?.(file)
            e.currentTarget.value = ''
          }}
        />
        {isUploadingImage ? 'Uploading...' : 'Upload Image'}
      </label>
      {form.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.image_url} alt="" className="mt-2 h-24 w-full rounded-xl object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}
    </Field>
  )

  const renderGalleryImageField = () => {
    const previewUrl = form.image_url
    const hasCustomImage = Boolean(form.image_url)

    return (
      <Field label="Image URL" fieldKey="image_url" focusedField={focusedField}>
        <div
          data-field="image_url"
          className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3 shadow-sm ring-1 ring-cyan-100/60 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:ring-cyan-900/30"
        >
          <div className="relative mb-3 h-36 overflow-hidden rounded-2xl border border-cyan-100 bg-white">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={form.title || 'Gallery image'}
                className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white text-center text-xs font-semibold text-cyan-700">
                <span className="text-2xl leading-none">+</span>
                No image selected
              </div>
            )}
            {hasCustomImage && (
              <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                Uploaded
              </span>
            )}
          </div>
          <input
            data-field="image_url"
            value={form.image_url}
            onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
            placeholder="Paste URL or upload image"
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition ${
              isUploadingImage
                ? 'cursor-wait border-cyan-200 bg-white/80 text-cyan-500'
                : 'border-cyan-200 bg-white text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50'
            }`}>
              {isUploadingImage ? (
                <LoadingSpinner className="h-3 w-3 border-[1.5px]" label="Uploading image" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                </svg>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={isUploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUploadImage?.(file)
                  e.currentTarget.value = ''
                }}
              />
              {isUploadingImage ? 'Uploading...' : 'Upload Image'}
            </label>
            {hasCustomImage && (
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Remove image
              </button>
            )}
          </div>
        </div>
      </Field>
    )
  }

  const renderServicesFields = () => (
    <>
      {serviceItems && serviceItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Solutions
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...serviceItems]
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
              .map((item, index) => {
                const payload = (item.payload ?? {}) as Record<string, string>
                const number = payload.service_number || String(index + 1).padStart(2, '0')
                const selected = editTarget?.id === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onServiceTabSelect?.(item)}
                    className={`min-w-[8rem] rounded-xl border px-3 py-2 text-left transition ${
                      selected
                        ? 'border-cyan-300 bg-cyan-50 shadow-sm ring-2 ring-cyan-100 dark:bg-slate-900'
                        : 'border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-cyan-600">
                      Solution {number}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {item.title || `Service ${number}`}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="relative h-32 bg-slate-100 dark:bg-slate-900">
          {form.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image_url} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
              Service image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/75">
                {form.payload.service_label || 'Solution'} {form.payload.service_number || '01'}
              </p>
              <p className="truncate text-sm font-bold text-white">
                {form.title || 'Untitled service'}
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900 shadow">
              {form.payload.service_number || '01'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {form.payload.service_label || 'Solution'} {form.payload.service_number || '01'} content
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            Parent
          </span>
        </div>
        <div className="space-y-3">
          <Field label="Service title" fieldKey="title" focusedField={focusedField}>
            <input data-field="title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Interior Design" className={inputClass} />
          </Field>
          <Field label="Service description" fieldKey="body" focusedField={focusedField}>
            <textarea data-field="body" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5} placeholder="Short paragraph shown under the service title" className={inputClass} />
          </Field>
          {renderImageField('Service image')}
        </div>
      </div>

      {(form.payload.service_number || '01') === '01' && (
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-900/30">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
            Services section header
          </p>
          <div className="space-y-3">
            <Field label="Eyebrow text" fieldKey="section_eyebrow" focusedField={focusedField}>
              <input data-field="section_eyebrow" value={form.payload.section_eyebrow ?? ''} onChange={e => updatePayloadField('section_eyebrow', e.target.value)} placeholder="Interior Services" className={inputClass} />
            </Field>
            <Field label="Heading" fieldKey="section_title" focusedField={focusedField}>
              <input data-field="section_title" value={form.payload.section_title ?? ''} onChange={e => updatePayloadField('section_title', e.target.value)} placeholder="What we do best." className={inputClass} />
            </Field>
            <Field label="Intro text" fieldKey="section_description" focusedField={focusedField}>
              <textarea data-field="section_description" value={form.payload.section_description ?? ''} onChange={e => updatePayloadField('section_description', e.target.value)} rows={3} placeholder="Short copy shown beside the heading" className={inputClass} />
            </Field>
            <Field label="CTA text" fieldKey="cta_text" focusedField={focusedField}>
              <input data-field="cta_text" value={form.payload.cta_text ?? ''} onChange={e => updatePayloadField('cta_text', e.target.value)} placeholder="Not sure which service fits your project?" className={inputClass} />
            </Field>
            <Field label="CTA button text" fieldKey="cta_button_text" focusedField={focusedField}>
              <input data-field="cta_button_text" value={form.payload.cta_button_text ?? ''} onChange={e => updatePayloadField('cta_button_text', e.target.value)} placeholder="Book a Free Consult" className={inputClass} />
            </Field>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-900/30">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
            {form.payload.service_label || 'Solution'} {form.payload.service_number || '01'} details
          </p>
          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-700">
            Fields
          </span>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label" fieldKey="service_label" focusedField={focusedField}>
              <input data-field="service_label" value={form.payload.service_label ?? ''} onChange={e => updatePayloadField('service_label', e.target.value)} placeholder="Solution" className={inputClass} />
            </Field>
            <Field label="Number" fieldKey="service_number" focusedField={focusedField}>
              <input data-field="service_number" value={form.payload.service_number ?? ''} onChange={e => updatePayloadField('service_number', e.target.value)} placeholder="01" className={inputClass} />
            </Field>
          </div>
          <Field label="Bullet points" fieldKey="bullets" focusedField={focusedField}>
            <NumberedLinesField
              dataField="bullets"
              value={form.payload.bullets ?? ''}
              onChange={val => updatePayloadField('bullets', val)}
            />
          </Field>
        </div>
      </div>
    </>
  )

  const renderGalleryFields = () => {
    const galleryOrder = Number.parseInt(form.sort_order, 10) || 0
    const isHeaderItem = galleryOrder === 0

    return (
      <>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Gallery image
          </p>
          <div className="space-y-3">
            <Field label="Image title" fieldKey="title" focusedField={focusedField}>
              <input data-field="title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Gallery image title" className={inputClass} />
            </Field>
            {renderGalleryImageField()}
            <Field label="Description" fieldKey="description" focusedField={focusedField}>
              <textarea data-field="description" value={form.payload.description ?? ''} onChange={e => updatePayloadField('description', e.target.value)} rows={3} placeholder="Short detail shown in the gallery popup" className={inputClass} />
            </Field>
            <Field label="Address" fieldKey="address" focusedField={focusedField}>
              <input data-field="address" value={form.payload.address ?? ''} onChange={e => updatePayloadField('address', e.target.value)} placeholder="Metro Manila" className={inputClass} />
            </Field>
          </div>
        </div>

        {isHeaderItem && (
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-900/30">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
              Section header
            </p>
            <div className="space-y-3">
              <Field label="Eyebrow" fieldKey="section_eyebrow" focusedField={focusedField}>
                <input data-field="section_eyebrow" value={form.payload.section_eyebrow ?? ''} onChange={e => updatePayloadField('section_eyebrow', e.target.value)} placeholder="Interior Gallery" className={inputClass} />
              </Field>
              <Field label="Heading" fieldKey="section_title" focusedField={focusedField}>
                <textarea data-field="section_title" value={form.payload.section_title ?? ''} onChange={e => updatePayloadField('section_title', e.target.value)} rows={2} placeholder="Designed, supplied, and installed by one team." className={inputClass} />
              </Field>
              <Field label="Button text" fieldKey="cta_text" focusedField={focusedField}>
                <input data-field="cta_text" value={form.payload.cta_text ?? ''} onChange={e => updatePayloadField('cta_text', e.target.value)} placeholder="See All Projects" className={inputClass} />
              </Field>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {isCreatingFromStatic ? `New ${section.itemLabel}` : 'Editing'}
            </p>
            {!isCreatingFromStatic && (
              <p className="mt-0.5 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {editTarget?.title ?? editTarget?.key ?? section.itemLabel}
              </p>
            )}
            {isCreatingFromStatic && (
              <p className="mt-0.5 text-xs text-amber-600">Pre-filled from static content</p>
            )}
          </div>
          <button type="button" onClick={onCancel} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">✕</button>
        </div>
        {focusedField && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <p className="text-[10px] font-semibold text-cyan-600">
              Editing: <span className="font-bold">{focusedFieldLabel}</span>
            </p>
          </div>
        )}
      </div>

      <div ref={scrollAreaRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {isGallery && renderGalleryFields()}
        {isServices && renderServicesFields()}

        {!isProjectsHeaderEdit && !isServices && !isGallery && section.id !== 'dreambuild-testimonials' && shouldShowField('title') && (
          <Field label={section.id === 'dreambuild-projects' ? 'Project title' : 'Title'} fieldKey="title" focusedField={focusedField}>
            <input data-field="title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Main title" className={inputClass} />
          </Field>
        )}
        {section.id !== 'dreambuild-services' && section.id !== 'dreambuild-hero' && !isGallery && section.id !== 'dreambuild-projects' && section.id !== 'dreambuild-testimonials' && shouldShowField('subtitle') && (
          <Field label="Subtitle" fieldKey="subtitle" focusedField={focusedField}>
            <input data-field="subtitle" value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="Short support text" className={inputClass} />
          </Field>
        )}
        {!isProjectsHeaderEdit && !isGallery && !isServices && shouldShowField('body') && (
          <Field label={section.id === 'dreambuild-projects' ? 'Detail-page story' : 'Body / description'} fieldKey="body" focusedField={focusedField}>
            <textarea data-field="body" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={section.id === 'dreambuild-projects' ? 6 : 3} placeholder={section.id === 'dreambuild-projects' ? 'The brief, design direction, supply/install notes, and final result.' : 'Longer copy, quote, or description'} className={inputClass} />
          </Field>
        )}

        {/* Image field with upload */}
        {!isProjectsHeaderEdit && !isServices && !isGallery && shouldShowField('image_url') && (
        <Field label={section.id === 'dreambuild-projects' ? 'Project image' : 'Image'} fieldKey="image_url" focusedField={focusedField}>
          <input
            data-field="image_url"
            value={form.image_url}
            onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
            placeholder="Paste URL or upload below"
            className={inputClass}
          />
          <label className={`mt-1.5 inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition ${
            isUploadingImage
              ? 'cursor-wait border-cyan-200 bg-cyan-50 text-cyan-500'
              : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-white'
          }`}>
            {isUploadingImage ? (
              <LoadingSpinner className="h-3 w-3 border-[1.5px]" label="Uploading image" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
              </svg>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={isUploadingImage}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onUploadImage?.(file)
                e.currentTarget.value = ''
              }}
            />
            {isUploadingImage ? 'Uploading…' : 'Upload Image'}
          </label>
          {form.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image_url} alt="" className="mt-2 h-24 w-full rounded-xl object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
        </Field>
        )}

        {section.id !== 'dreambuild-services' && !isGallery && section.id !== 'dreambuild-projects' && section.id !== 'dreambuild-testimonials' && (shouldShowField('link_url') || shouldShowField('button_text')) && (
          <>
            {shouldShowField('link_url') && (
              <Field label="Link URL" fieldKey="link_url" focusedField={focusedField}>
                <input data-field="link_url" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="/projects or https://..." className={inputClass} />
              </Field>
            )}
            {shouldShowField('button_text') && (
              <Field label="Button text" fieldKey="button_text" focusedField={focusedField}>
                <input data-field="button_text" value={form.button_text} onChange={e => setForm(p => ({ ...p, button_text: e.target.value }))} placeholder="e.g. View Project" className={inputClass} />
              </Field>
            )}
          </>
        )}

        {!isServices && !isGallery && sectionFieldsToRender.filter(field => shouldShowField(field.key)).length > 0 && (
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-900/30">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
              {section.label} fields
            </p>
            <div className="space-y-3">
              {sectionFieldsToRender.filter(field => shouldShowField(field.key)).map(field => (
                <Field key={field.key} label={field.label} fieldKey={field.key} focusedField={focusedField}>
                  {field.kind === 'image-list' ? (
                    <div data-field={field.key}>
                      <CarouselImagesField
                        value={form.payload[field.key] ?? ''}
                        onChange={val => setForm(p => ({ ...p, payload: { ...p.payload, [field.key]: val } }))}
                      />
                    </div>
                  ) : field.kind === 'select' ? (
                    <select data-field={field.key} value={form.payload[field.key] ?? ''} onChange={e => setForm(p => ({ ...p, payload: { ...p.payload, [field.key]: e.target.value } }))} className={inputClass}>
                      <option value="">Select…</option>
                      {(field.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.key === 'bullets' ? (
                    <NumberedLinesField
                      dataField={field.key}
                      value={form.payload[field.key] ?? ''}
                      onChange={val => setForm(p => ({ ...p, payload: { ...p.payload, [field.key]: val } }))}
                    />
                  ) : field.kind === 'chips' ? (
                    <ChipListField
                      dataField={field.key}
                      value={form.payload[field.key] ?? ''}
                      onChange={val => setForm(p => ({ ...p, payload: { ...p.payload, [field.key]: val } }))}
                    />
                  ) : field.kind === 'textarea' ? (
                    <textarea data-field={field.key} value={form.payload[field.key] ?? ''} onChange={e => setForm(p => ({ ...p, payload: { ...p.payload, [field.key]: e.target.value } }))} rows={3} className={inputClass} />
                  ) : (
                    <input data-field={field.key} value={form.payload[field.key] ?? ''} onChange={e => setForm(p => ({ ...p, payload: { ...p.payload, [field.key]: e.target.value } }))} className={inputClass} />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="shrink-0 space-y-2 border-t border-slate-100 p-4 dark:border-slate-800">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
          Active (visible on site)
        </label>
        <button type="submit" disabled={isSaveDisabled} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-cyan-700/20 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isBusy && <LoadingSpinner className="h-3.5 w-3.5" label="Saving" />}
          {isBusy ? 'Saving' : editTarget ? 'Save Changes' : `Create ${section.itemLabel}`}
        </button>
        {editTarget && (
          <button type="button" onClick={onDelete} className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

function BlogEditPanel({
  form, setForm, editTarget, isBusy, isSaveDisabled, onSubmit, onDelete, onCancel,
  focusedField, onUploadImage, isUploadingImage,
}: {
  section: DreamBuildSection
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editTarget: WebPageItem | null
  isBusy: boolean
  isSaveDisabled: boolean
  onSubmit: (e: FormEvent) => void
  onDelete: () => void
  onCancel: () => void
  focusedField?: string | null
  onUploadImage?: (file: File) => Promise<void>
  isUploadingImage?: boolean
}) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const slugValue = slugify(form.title)
  const takeaways = (form.payload.takeaways ?? '').split('\n').map(v => v.trim()).filter(Boolean)
  const articleSections = (form.payload.sections ?? '').split('\n').map(v => v.trim()).filter(Boolean)
  const faqs = (form.payload.faq ?? '').split('\n').map(v => v.trim()).filter(Boolean)

  useEffect(() => {
    if (!focusedField || !scrollAreaRef.current) return
    const el = scrollAreaRef.current.querySelector<HTMLElement>(`[data-field="${focusedField}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => el.querySelector<HTMLElement>('input, textarea, select')?.focus(), 150)
  }, [focusedField])

  const updatePayload = (key: string, value: string) => {
    setForm(p => ({ ...p, payload: { ...p.payload, [key]: value } }))
  }

  const baseInput = `${inputClass} bg-white`

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              DreamBuild Blog Article Builder
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
              {editTarget ? (editTarget.title ?? 'Editing article') : 'New blog article'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Same content blocks as the public DreamBuild blog page: card, hero, design brief, takeaways, sections, gallery, and FAQ.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">x</button>
        </div>
        {focusedField && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[10px] font-semibold text-emerald-700">
              Editing: <span className="font-bold">{focusedField.replace(/_/g, ' ')}</span>
            </p>
          </div>
        )}
      </div>

      <div ref={scrollAreaRef} className="flex-1 space-y-5 overflow-y-auto bg-slate-50/70 p-5">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="relative h-32 bg-gradient-to-br from-stone-200 via-stone-100 to-amber-100">
            {form.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-700">
                {form.payload.category || 'Category'}
              </span>
              <p className="mt-2 line-clamp-1 text-sm font-bold text-white">{form.title || 'Article title preview'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-stone-100 p-4 text-[11px] text-stone-500">
            <span>{form.payload.date || 'Date label'}</span>
            <span>{form.payload.read_time || 'Read time'}</span>
            <span className="truncate text-right">/blogs/{slugValue || 'slug'}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Landing card and article hero</p>
          <div className="space-y-3">
            <Field label="Article title" fieldKey="title" focusedField={focusedField}>
              <input data-field="title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="How To Build A Warm Modern Living Room" className={baseInput} />
            </Field>
            <Field label="Excerpt / subtitle" fieldKey="subtitle" focusedField={focusedField}>
              <textarea
                data-field="subtitle"
                value={form.subtitle}
                maxLength={SUBTITLE_LIMIT}
                onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
                rows={2}
                placeholder="Short text shown on blog cards and below the article title."
                className={baseInput}
              />
              <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-400">Keep this short. Put longer copy in Design brief, Body, or Article sections.</span>
                <span className={form.subtitle.length > SUBTITLE_LIMIT - 25 ? 'font-semibold text-amber-600' : 'text-slate-400'}>
                  {form.subtitle.length}/{SUBTITLE_LIMIT}
                </span>
              </div>
            </Field>
            <div className="grid gap-3">
              <Field label="Category" fieldKey="category" focusedField={focusedField}>
                <input data-field="category" value={form.payload.category ?? ''} onChange={e => updatePayload('category', e.target.value)} placeholder="Styling Guide" className={baseInput} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date label" fieldKey="date" focusedField={focusedField}>
                <input
                  data-field="date"
                  type="date"
                  value={dateLabelToInputValue(form.payload.date ?? '')}
                  onChange={e => updatePayload('date', inputValueToDateLabel(e.target.value))}
                  className={baseInput}
                />
              </Field>
              <Field label="Read time" fieldKey="read_time" focusedField={focusedField}>
                <input data-field="read_time" value={form.payload.read_time ?? ''} onChange={e => updatePayload('read_time', e.target.value)} placeholder="5 min read" className={baseInput} />
              </Field>
            </div>
            <Field label="Featured image" fieldKey="image_url" focusedField={focusedField}>
              <input data-field="image_url" value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="Paste URL or upload below" className={baseInput} />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition ${isUploadingImage ? 'cursor-wait border-emerald-200 bg-emerald-50 text-emerald-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white'}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={isUploadingImage} onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void onUploadImage?.(file)
                    e.currentTarget.value = ''
                  }} />
                  {isUploadingImage ? 'Uploading...' : 'Upload featured image'}
                </label>
                {form.image_url ? (
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-white"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </Field>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Article content blocks</p>
          <div className="space-y-3">
            <Field label="Design brief" fieldKey="design_brief" focusedField={focusedField}>
              <textarea data-field="design_brief" value={form.payload.design_brief ?? ''} onChange={e => updatePayload('design_brief', e.target.value)} rows={3} placeholder="Appears in the article hero overlay and Design Brief box." className={baseInput} />
            </Field>
            <Field label="Fallback body paragraph" fieldKey="body" focusedField={focusedField}>
              <textarea data-field="body" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={3} placeholder="Used if design brief is empty, or as supporting article copy." className={baseInput} />
            </Field>
            <Field label="Key takeaways" fieldKey="takeaways" focusedField={focusedField}>
              <RepeatableTextListField
                value={form.payload.takeaways ?? ''}
                onChange={value => updatePayload('takeaways', value)}
                dataField="takeaways"
                addLabel="Add takeaway"
                placeholder="Example: Start with a calm base palette"
              />
              <p className="mt-1 text-[11px] text-slate-400">{takeaways.length} takeaway{takeaways.length === 1 ? '' : 's'} will show on the article page.</p>
            </Field>
            <Field label="Article sections" fieldKey="sections" focusedField={focusedField}>
              <RepeatableArticleSectionsField
                value={form.payload.sections ?? ''}
                onChange={value => updatePayload('sections', value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">{articleSections.length} section{articleSections.length === 1 ? '' : 's'} will generate the table of contents.</p>
            </Field>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Gallery and FAQ</p>
          <div className="space-y-3">
            <Field label="In-article gallery images" fieldKey="gallery_images" focusedField={focusedField}>
              <div data-field="gallery_images">
                <CarouselImagesField value={form.payload.gallery_images ?? ''} onChange={val => updatePayload('gallery_images', val)} />
              </div>
            </Field>
            <Field label="FAQ items" fieldKey="faq" focusedField={focusedField}>
              <textarea data-field="faq" value={form.payload.faq ?? ''} onChange={e => updatePayload('faq', e.target.value)} rows={5} placeholder={'Format: Question|Answer, one FAQ per line\nExample: What makes a room feel warm?|Repeated texture and layered lighting.'} className={baseInput} />
              <p className="mt-1 text-[11px] text-slate-400">{faqs.length} FAQ item{faqs.length === 1 ? '' : 's'} will show at the bottom of the article.</p>
            </Field>
          </div>
        </div>

      </div>

      <div className="shrink-0 space-y-2 border-t border-slate-100 bg-white p-4 dark:border-slate-800">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          Active (visible on DreamBuild)
        </label>
        <button type="submit" disabled={isSaveDisabled} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isBusy && <LoadingSpinner className="h-3.5 w-3.5" label="Saving" />}
          {isBusy ? 'Saving' : editTarget ? 'Save Blog Article' : 'Create Blog Article'}
        </button>
        {editTarget && (
          <button type="button" onClick={onDelete} className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

function ProcessEditPanel({
  form, setForm, editTarget, isBusy, isSaveDisabled, onSubmit, onDelete, onCancel, focusedField,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editTarget: WebPageItem | null
  isBusy: boolean
  isSaveDisabled: boolean
  onSubmit: (e: FormEvent) => void
  onDelete: () => void
  onCancel: () => void
  focusedField?: string | null
}) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const stepNumber = form.payload.step_number || '01'

  useEffect(() => {
    if (!focusedField || !scrollAreaRef.current) return
    const el = scrollAreaRef.current.querySelector<HTMLElement>(`[data-field="${focusedField}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => el.querySelector<HTMLElement>('input, textarea, select')?.focus(), 150)
  }, [focusedField])

  const updatePayload = (key: string, value: string) => {
    setForm(p => ({ ...p, payload: { ...p.payload, [key]: value } }))
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
              DreamBuild Process Step
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
              {editTarget ? (editTarget.title ?? 'Editing process step') : 'New process step'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              This matches the public Process cards: step number, title, and description.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {editTarget && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
              >
                Delete
              </button>
            )}
            <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">x</button>
          </div>
        </div>
      </div>

      <div ref={scrollAreaRef} className="flex-1 space-y-5 overflow-y-auto bg-slate-50/70 p-5">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-stone-900">
            <span className="text-sm font-bold text-stone-900">{stepNumber}</span>
          </div>
          <p className="mt-5 text-lg font-semibold text-stone-950">{form.title || 'Step title preview'}</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            {form.body || 'Step description preview will appear here.'}
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Process card content</p>
          <div className="space-y-3">
            <Field label="Step number" fieldKey="step_number" focusedField={focusedField}>
              <input
                data-field="step_number"
                value={form.payload.step_number ?? ''}
                onChange={e => updatePayload('step_number', e.target.value)}
                placeholder="01"
                className={inputClass}
              />
            </Field>
            <Field label="Step title" fieldKey="title" focusedField={focusedField}>
              <input
                data-field="title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Step title"
                className={inputClass}
              />
            </Field>
            <Field label="Step description" fieldKey="body" focusedField={focusedField}>
              <textarea
                data-field="body"
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                rows={5}
                placeholder="We collect references, understand how the client lives, and define the emotional tone the home should carry."
                className={inputClass}
              />
            </Field>
          </div>
        </div>

      </div>

      <div className="shrink-0 space-y-2 border-t border-slate-100 bg-white p-4 dark:border-slate-800">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
          Active (visible on DreamBuild)
        </label>
        <button type="submit" disabled={isSaveDisabled} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-sky-700/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isBusy && <LoadingSpinner className="h-3.5 w-3.5" label="Saving" />}
          {isBusy ? 'Saving' : editTarget ? 'Save Process Step' : 'Create Process Step'}
        </button>
        {editTarget && (
          <button type="button" onClick={onDelete} className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

export default function DreamBuildContentManager() {
  const [selectedType, setSelectedType] = useState<WebPageType>('dreambuild-hero')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editTarget, setEditTarget] = useState<WebPageItem | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(COMPACT_PANEL_WIDTH)
  const [isResizingPanel, setIsResizingPanel] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WebPageItem | null>(null)
  const [draftForms, setDraftForms] = useState<Record<string, FormState>>({})
  const editorShellRef = useRef<HTMLDivElement | null>(null)

  const selectedSection = useMemo(
    () => sections.find(s => s.id === selectedType) ?? sections[0],
    [selectedType],
  )

  const { currentData, isFetching, isError } = useGetAdminWebPageItemsQuery({
    type: selectedSection.id, page: 1, perPage: 100, status: 'all',
  })
  // `currentData` is undefined while the query is fetching a *new* section (tab
  // switch or first load), but stays populated during a same-tab refetch (e.g.
  // after a save). So this shows the skeleton on every tab change without
  // blanking the canvas when you just saved an edit.
  const isSectionLoading = !currentData && !isError

  const [createItem, { isLoading: isCreating }] = useCreateAdminWebPageItemMutation()
  const [updateItem, { isLoading: isUpdating }] = useUpdateAdminWebPageItemMutation()
  const [deleteItem, { isLoading: isDeleting }] = useDeleteAdminWebPageItemMutation()

  const isBusy = isCreating || isUpdating
  const isMissingRequiredProjectFields =
    selectedSection.id === 'dreambuild-projects' &&
    form.key !== PROJECTS_HEADER_KEY &&
    !form.title.trim()
  const hasUnsavedChanges = useMemo(() => {
    if (!editTarget || editTarget.id < 0) return true

    const currentPayload = toPayload(form, selectedSection)
    const savedPayload = toPayload(toForm(editTarget, selectedSection), selectedSection)

    return stableStringify(currentPayload) !== stableStringify(savedPayload)
  }, [editTarget, form, selectedSection])
  const isSaveDisabled = isBusy || isMissingRequiredProjectFields || Boolean(editTarget && editTarget.id > 0 && !hasUnsavedChanges)

  useEffect(() => {
    if (!isResizingPanel) return

    const onPointerMove = (event: PointerEvent) => {
      const bounds = editorShellRef.current?.getBoundingClientRect()
      if (!bounds) return

      const maxWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, bounds.width - 280))
      const nextWidth = Math.round(bounds.right - event.clientX)
      setPanelWidth(Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, nextWidth)))
    }

    const onPointerUp = () => {
      setIsResizingPanel(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingPanel])

  // Real-time canvas: merge draft state into items for live preview
  const displayItems = useMemo(() => {
    const saved = (currentData?.items ?? []).filter(item => {
      if (selectedSection.id === 'dreambuild-blogs') {
        return !isLegacyDreamBuildBlogPlaceholder(item)
      }
      if (selectedSection.id === 'dreambuild-testimonials') {
        return !isLegacyDreamBuildTestimonialPlaceholder(item)
      }
      if (selectedSection.id === 'dreambuild-projects') {
        return !isLegacyDreamBuildProjectPlaceholder(item)
      }
      return true
    })
    const merged = saved.map(item => {
      const draft = draftForms[draftKeyFor(selectedSection.id, item.id)]
      return draft ? mergeItem(item, draft) : item
    })
    const visibleSaved = selectedSection.id === 'dreambuild-gallery'
      ? merged.filter(item => Boolean(item.image_url))
      : selectedSection.id === 'dreambuild-projects'
        ? merged
        : merged

    if (!editTarget || saved.some(item => item.id === editTarget.id)) return visibleSaved
    if (selectedSection.id === 'dreambuild-blogs' && isLegacyDreamBuildBlogPlaceholder(editTarget)) return visibleSaved
    if (selectedSection.id === 'dreambuild-testimonials' && isLegacyDreamBuildTestimonialPlaceholder(editTarget)) return visibleSaved
    if (selectedSection.id === 'dreambuild-projects' && isLegacyDreamBuildProjectPlaceholder(editTarget)) return visibleSaved

    const draft = draftForms[draftKeyFor(selectedSection.id, editTarget.id)] ?? form
    if (selectedSection.id === 'dreambuild-projects' && draft.key !== PROJECTS_HEADER_KEY && !draft.title.trim()) {
      return visibleSaved
    }
    return [...visibleSaved, mergeItem(editTarget, draft)]
  }, [currentData?.items, draftForms, editTarget, form, selectedSection.id])
  const displayItemCount = selectedSection.id === 'dreambuild-projects'
    ? displayItems.filter(item => !isProjectsHeaderItem(item)).length
    : displayItems.length

  const keepSavedItemOpen = (item: WebPageItem) => {
    setDraftForms(prev => {
      const next = { ...prev }
      delete next[draftKeyFor(selectedSection.id, item.id)]
      return next
    })
    setEditTarget(item)
    setForm(toForm(item, selectedSection))
    setPanelOpen(true)
    setDeleteTarget(null)
  }

  const setDraftingForm: React.Dispatch<React.SetStateAction<FormState>> = (value) => {
    const next = typeof value === 'function'
      ? (value as (previous: FormState) => FormState)(form)
      : value

    setForm(next)

    if (!editTarget) return
    setDraftForms(prev => ({ ...prev, [draftKeyFor(selectedSection.id, editTarget.id)]: next }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditTarget(null)
    setPanelOpen(false)
    setFocusedField(null)
    setDeleteTarget(null)
    setDraftForms({})
  }

  const handleSectionChange = (type: WebPageType) => {
    setSelectedType(type)
    setPanelWidth(type === 'dreambuild-blogs' ? BLOG_PANEL_WIDTH : COMPACT_PANEL_WIDTH)
    resetForm()
  }

  // Opens the edit panel for an item, optionally focusing a specific field
  const openPanel = (item: WebPageItem, focusField?: string | null) => {
    const isSameItem = editTarget !== null && editTarget.id === item.id
    if (!isSameItem) {
      const draft = item.id > 0 ? draftForms[draftKeyFor(selectedSection.id, item.id)] : undefined
      if (item.id < 0) {
        setEditTarget(null)
        setForm(draft ?? toForm(item, selectedSection))
      } else {
        setEditTarget(item)
        setForm(draft ?? toForm(item, selectedSection))
      }
    }
    setPanelOpen(true)
    setFocusedField(focusField ?? null)
  }

  const handleSelect = (item: WebPageItem) => openPanel(item)
  const handleFieldFocus = (item: WebPageItem, fieldKey: string) => openPanel(item, fieldKey)
  const handleAddNew = () => {
    const orderBasis = selectedSection.id === 'dreambuild-projects' ? displayItemCount : displayItems.length
    const nextStepNumber = String(orderBasis + 1).padStart(2, '0')
    const nextSortOrder = orderBasis

    if (selectedSection.id === 'dreambuild-gallery') {
      const nextForm: FormState = {
        ...emptyForm,
        sort_order: String(nextSortOrder),
        payload: {
          description: '',
          address: '',
        },
      }
      const draftItem: WebPageItem = {
        id: -Date.now(),
        type: selectedSection.id,
        key: `gallery-draft-${Date.now()}`,
        sort_order: nextSortOrder,
        is_active: true,
        title: null,
        subtitle: null,
        body: null,
        image_url: null,
        link_url: null,
        button_text: null,
        payload: nextForm.payload,
      }
      setEditTarget(draftItem)
      setForm(nextForm)
      setPanelOpen(true)
      setFocusedField('image_url')
      setDeleteTarget(null)
      return
    }

    if (selectedSection.id === 'dreambuild-projects') {
      const draftId = -Date.now()
      const nextForm: FormState = {
        ...emptyForm,
        sort_order: String(nextSortOrder),
        payload: {
          tag: '',
          city_area: '',
          scope_items: '',
          timeline: '',
          card_size: 'tall',
        },
      }
      const draftItem: WebPageItem = {
        id: draftId,
        type: selectedSection.id,
        key: `project-draft-${Date.now()}`,
        sort_order: nextSortOrder,
        is_active: true,
        title: null,
        subtitle: null,
        body: null,
        image_url: null,
        link_url: null,
        button_text: null,
        payload: nextForm.payload,
      }
      setEditTarget(draftItem)
      setForm(nextForm)
      setPanelOpen(true)
      setFocusedField(null)
      setDeleteTarget(null)
      return
    }

    setEditTarget(null)
    setForm(selectedSection.id === 'dreambuild-blogs'
      ? {
        ...emptyForm,
        payload: {},
      }
      : selectedSection.id === 'dreambuild-process'
        ? {
          ...emptyForm,
          sort_order: String(displayItems.length),
          payload: {
            step_number: nextStepNumber,
          },
        }
      : selectedSection.id === 'dreambuild-services'
        ? {
          ...emptyForm,
          sort_order: String(displayItems.length),
          payload: {
            service_label: 'Solution',
            service_number: nextStepNumber,
            bullets: '',
          },
        }
      : emptyForm)
    setPanelOpen(true)
    setFocusedField(null)
  }

  const handleUploadImage = async (file: File) => {
    setIsUploadingImage(true)
    try {
      const payload = new FormData()
      payload.append('file', file)
      payload.append('folder', 'web-content')
      payload.append('asset_type', 'image')
      const response = await fetch('/api/admin/upload', { method: 'POST', body: payload })
      const result = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Upload failed')
      setDraftingForm(p => ({ ...p, image_url: result.url! }))
      showSuccessToast('Image uploaded.')
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to upload image.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (editTarget && editTarget.id > 0 && !hasUnsavedChanges) return

    try {
      if (editTarget && editTarget.id > 0) {
        const response = await updateItem({ type: selectedSection.id, id: editTarget.id, data: toPayload(form, selectedSection) }).unwrap()
        keepSavedItemOpen(response.item)
        await revalidateDreamBuild()
        showSuccessToast(`${selectedSection.itemLabel} updated.`)
      } else {
        const response = await createItem({ type: selectedSection.id, data: toPayload(form, selectedSection) }).unwrap()
        keepSavedItemOpen(response.item)
        await revalidateDreamBuild()
        showSuccessToast(`${selectedSection.itemLabel} created.`)
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string; errors?: Record<string, string[]> } }
      const first = apiErr?.data?.errors ? Object.values(apiErr.data.errors)[0]?.[0] : undefined
      showErrorToast(first ?? apiErr?.data?.message ?? 'Failed to save.')
    }
  }

  const handleRequestDelete = (item = editTarget) => {
    if (!item) return
    if (item.id < 0) {
      resetForm()
      return
    }
    setDeleteTarget(item)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteTarget.id < 0) return
    try {
      await deleteItem({ type: selectedSection.id, id: deleteTarget.id }).unwrap()
      await revalidateDreamBuild()
      showSuccessToast(`${selectedSection.itemLabel} deleted.`)
      if (editTarget?.id === deleteTarget.id) {
        resetForm()
      } else {
        setDeleteTarget(null)
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } }
      showErrorToast(apiErr?.data?.message ?? 'Failed to delete.')
    }
  }

  return (
    <div
      ref={editorShellRef}
      className="flex overflow-hidden rounded-3xl border border-slate-200 bg-[#edeae5] shadow-sm dark:border-slate-800"
      style={{ height: 'calc(100vh - 120px)', minHeight: 640 }}
    >
      {/* ── 1. Dark sidebar ─────────────────────────────────────────── */}
      <aside className="flex w-52 shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#0f0f0f]">
        <div className="shrink-0 border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">DreamBuild</p>
          <p className="mt-0.5 text-sm font-semibold text-white">Content Editor</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <p className="px-5 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-stone-600">Sections</p>
          {sections.map(section => (
            <button
              key={section.id}
              type="button"
              onClick={() => handleSectionChange(section.id)}
              className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-left text-sm transition ${
                selectedSection.id === section.id
                  ? 'bg-white/10 font-semibold text-white'
                  : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${section.dot}`} />
              {section.label}
            </button>
          ))}
        </nav>
        {isError && (
          <p className="shrink-0 border-t border-white/10 px-5 py-3 text-[10px] leading-relaxed text-amber-400">
            Backend needs to support {selectedSection.id}.
          </p>
        )}
      </aside>

      {/* ── 2. Canvas ────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Fake browser bar */}
        <div className="shrink-0 border-b border-stone-300/40 bg-[#e2ddd7] px-5 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white/50 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              <span className="text-xs text-stone-400">dreambuild.ph · {selectedSection.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${selectedSection.dot}`} />
              <span className="text-xs font-medium text-stone-500">{displayItemCount} items</span>
            </div>
          </div>
        </div>

        {isFetching && !isSectionLoading && (
          <div className="h-0.5 shrink-0 overflow-hidden bg-cyan-200">
            <div className="h-full w-1/3 animate-pulse bg-cyan-500" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isSectionLoading ? (
            <CanvasSkeleton />
          ) : (
            <SectionCanvas
              section={selectedSection}
              items={displayItems}
              selected={editTarget}
              onSelect={handleSelect}
              onRequestDelete={handleRequestDelete}
              onAddNew={handleAddNew}
              isLoading={isSectionLoading}
              onFieldFocus={handleFieldFocus}
              focusedField={focusedField}
            />
          )}
        </div>
      </div>

      {/* ── 3. Edit panel ────────────────────────────────────────────── */}
      <aside
        className={`relative flex max-w-[calc(100vw-16rem)] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${
          isResizingPanel ? '' : 'transition-[width] duration-200'
        }`}
        style={{ width: panelOpen ? panelWidth : 0 }}
      >
        {panelOpen && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize editor panel"
              title="Drag to resize"
              onPointerDown={(event) => {
                event.preventDefault()
                setIsResizingPanel(true)
              }}
              className={`group absolute left-0 top-0 z-20 h-full w-2 cursor-col-resize transition ${
                isResizingPanel ? 'bg-emerald-400/40' : 'bg-transparent hover:bg-emerald-400/25'
              }`}
            >
              <span className={`absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition ${
                isResizingPanel ? 'bg-emerald-600' : 'bg-slate-300 opacity-0 group-hover:opacity-100'
              }`} />
            </div>
            <EditPanel
              section={selectedSection}
              form={form}
              setForm={setDraftingForm}
              editTarget={editTarget}
              isBusy={isBusy}
              isSaveDisabled={isSaveDisabled}
              onSubmit={handleSubmit}
              onDelete={() => handleRequestDelete()}
              onCancel={resetForm}
              focusedField={focusedField}
              onUploadImage={handleUploadImage}
              isUploadingImage={isUploadingImage}
              serviceItems={selectedSection.id === 'dreambuild-services' ? displayItems : undefined}
              onServiceTabSelect={handleSelect}
            />
          </>
        )}
      </aside>

      {deleteTarget && (
        <DeleteConfirmModal
          itemLabel={selectedSection.itemLabel}
          itemTitle={deleteTarget.title ?? deleteTarget.key ?? selectedSection.itemLabel}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}

// ─── Shared UI ──────────────────────────────────────────────────────────────────

function ProgressBar() {
  return (
    <div className="mb-4 h-0.5 overflow-hidden rounded-full bg-stone-200">
      <div className="h-full w-1/2 animate-pulse rounded-full bg-stone-400" />
    </div>
  )
}

// Skeleton placeholder shown while a section's items are loading (all tabs).
function CanvasSkeleton() {
  return (
    <div className="mx-auto max-w-4xl p-8" aria-busy="true" aria-label="Loading content">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded-full bg-stone-200" />
          <div className="h-8 w-72 animate-pulse rounded-lg bg-stone-200" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-full bg-stone-200" />
      </div>
      {/* Cards */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            <div className="h-40 w-full animate-pulse rounded-2xl bg-stone-200" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
            <div className="h-5 w-3/4 animate-pulse rounded-lg bg-stone-200" />
            <div className="h-3 w-full animate-pulse rounded-full bg-stone-100" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DeleteConfirmModal({
  itemLabel,
  itemTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  itemLabel: string
  itemTitle: string
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex animate-[dreambuildModalFadeIn_160ms_ease-out] items-center justify-center bg-stone-950/50 px-4 backdrop-blur-sm">
      <style jsx global>{`
        @keyframes dreambuildModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes dreambuildModalPanelIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div className="w-full max-w-md animate-[dreambuildModalPanelIn_180ms_ease-out] rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-500">Confirm delete</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">Delete this {itemLabel.toLowerCase()}?</h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          This will permanently remove <span className="font-semibold text-stone-900">&ldquo;{itemTitle}&rdquo;</span> from the CMS records.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex min-w-24 items-center justify-center whitespace-nowrap rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex min-w-28 items-center justify-center whitespace-nowrap rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {isDeleting ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner className="h-3.5 w-3.5" label="Deleting" />
                Deleting
              </span>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function NumberedLinesField({
  value,
  onChange,
  dataField,
}: {
  value: string
  onChange: (value: string) => void
  dataField: string
}) {
  const lines = value === '' ? [''] : value.split('\n')

  const focusLine = (container: HTMLElement | null, index: number) => {
    window.setTimeout(() => {
      container
        ?.querySelector<HTMLInputElement>(`input[data-line-index="${index}"]`)
        ?.focus()
    }, 0)
  }

  const updateLines = (next: string[]) => onChange(next.join('\n'))

  const updateLine = (index: number, nextValue: string) => {
    const next = [...lines]
    next[index] = nextValue.replace(/\r?\n/g, ' ')
    updateLines(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    const container = event.currentTarget.closest<HTMLElement>(`[data-field="${dataField}"]`)

    if (event.key === 'Enter') {
      event.preventDefault()
      const next = [...lines]
      next.splice(index + 1, 0, '')
      updateLines(next)
      focusLine(container, index + 1)
      return
    }

    if (event.key === 'Backspace' && lines[index] === '' && lines.length > 1) {
      event.preventDefault()
      const next = lines.filter((_, lineIndex) => lineIndex !== index)
      updateLines(next)
      focusLine(container, Math.max(index - 1, 0))
    }
  }

  return (
    <div data-field={dataField} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-cyan-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-[2rem_1fr] items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {String(index + 1).padStart(2, '0')}
          </span>
          <input
            data-line-index={index}
            value={line}
            onChange={event => updateLine(index, event.target.value)}
            onKeyDown={event => handleKeyDown(event, index)}
            placeholder="Bullet text"
            className="min-w-0 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-200 focus:bg-white dark:text-slate-100 dark:focus:bg-slate-900"
          />
        </div>
      ))}
    </div>
  )
}

function ChipListField({
  value,
  onChange,
  dataField,
}: {
  value: string
  onChange: (value: string) => void
  dataField: string
}) {
  const [draft, setDraft] = useState('')
  const items = value.split('\n').map(item => item.trim()).filter(Boolean)

  const commitItems = (nextItems: string[]) => {
    const uniqueItems = nextItems
      .map(item => item.trim())
      .filter(Boolean)
      .filter((item, index, all) => all.findIndex(other => other.toLowerCase() === item.toLowerCase()) === index)
    onChange(uniqueItems.join('\n'))
  }

  const addItem = () => {
    const nextItem = draft.trim()
    if (!nextItem) return
    commitItems([...items, nextItem])
    setDraft('')
  }

  const removeItem = (itemToRemove: string) => {
    commitItems(items.filter(item => item !== itemToRemove))
  }

  return (
    <div
      data-field={dataField}
      className="space-y-2 rounded-2xl border border-cyan-200 bg-cyan-50/50 p-2 transition focus-within:border-cyan-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-100"
    >
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addItem()
            }
          }}
          placeholder="Add scope item"
          className="min-w-0 flex-1 rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="shrink-0 rounded-xl bg-cyan-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${item}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800'

function Field({
  label, children, fieldKey, focusedField,
}: {
  label: string
  children: ReactNode
  fieldKey?: string
  focusedField?: string | null
}) {
  const highlighted = Boolean(fieldKey && focusedField === fieldKey)
  return (
    <label
      className={`block space-y-1.5 rounded-xl px-2 py-1.5 -mx-2 transition-colors duration-150 ${
        highlighted ? 'bg-cyan-50 ring-1 ring-cyan-200' : ''
      }`}
    >
      <span className={`text-xs font-semibold transition-colors ${
        highlighted ? 'text-cyan-600' : 'text-slate-500 dark:text-slate-400'
      }`}>
        {label}
        {highlighted && <span className="ml-1.5 rounded bg-cyan-500 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">active</span>}
      </span>
      {children}
    </label>
  )
}
