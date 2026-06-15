import LandingPage from "@/components/landing-page/LandingPage"
import Template1Component from "@/components/partner/templates/template1"
import Template2Component from "@/components/partner/templates/template2"
import Template3Component from "@/components/partner/templates/template3"
import Template4Component from "@/components/partner/templates/template4"
import { getPartnerStorefrontConfig } from "@/libs/partnerStorefront"
import type { WebPageItem } from "@/store/api/webPagesApi"

type PartnerLandingPageViewProps = {
  partnerSlug: string
  storefrontItem?: WebPageItem | null
}

type BlockBase = {
  id: string
  type: string
}

type NavBlock = BlockBase & {
  type: "nav"
  storeName?: string
  logo?: string
  primaryColor?: string
  links?: Array<{ label: string; href: string }>
}

type HeroBlock = BlockBase & {
  type: "hero"
  tagline?: string
  description?: string
  bgImage?: string
  align?: "left" | "center" | "right"
  btnPrimary?: string
  btnSecondary?: string
  badge1?: string
  badge2?: string
  badge3?: string
}

type StatsBlock = BlockBase & {
  type: "stats"
  items?: Array<{ value: string; label: string }>
}

type AboutBlock = BlockBase & {
  type: "about"
  heading?: string
  story?: string
  image?: string
  highlights?: Array<{ icon: string; text: string }>
}

type TestimonialBlock = BlockBase & {
  type: "testimonial"
  text?: string
}

type FeaturesBlock = BlockBase & {
  type: "features"
  title?: string
  subtitle?: string
}

type CtaBlock = BlockBase & {
  type: "cta"
  title?: string
  subtitle?: string
  btnText?: string
}

type FooterBlock = BlockBase & {
  type: "footer"
  email?: string
  phone?: string
  address?: string
  socialFacebook?: string
  socialInstagram?: string
  socialX?: string
}

type LandingBlock =
  | NavBlock
  | HeroBlock
  | StatsBlock
  | AboutBlock
  | TestimonialBlock
  | FeaturesBlock
  | CtaBlock
  | FooterBlock

const parseBlocks = (value: unknown): LandingBlock[] => {
  if (typeof value !== "string" || value.trim().length === 0) return []

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is LandingBlock => Boolean(item) && typeof item === "object"
    )
  } catch {
    return []
  }
}

const getFieldValue = (fields: Record<string, unknown>, key: string) =>
  String(fields[key] ?? "").trim()

function mapCommonContent(blocks: LandingBlock[]) {
  const nav = blocks.find((block) => block.type === "nav") as
    | NavBlock
    | undefined
  const hero = blocks.find((block) => block.type === "hero") as
    | HeroBlock
    | undefined
  const about = blocks.find((block) => block.type === "about") as
    | AboutBlock
    | undefined
  const testimonial = blocks.find((block) => block.type === "testimonial") as
    | TestimonialBlock
    | undefined
  const stats = blocks.find((block) => block.type === "stats") as
    | StatsBlock
    | undefined
  const features = blocks.find((block) => block.type === "features") as
    | FeaturesBlock
    | undefined
  const cta = blocks.find((block) => block.type === "cta") as
    | CtaBlock
    | undefined
  const footer = blocks.find((block) => block.type === "footer") as
    | FooterBlock
    | undefined
  const items = stats?.items ?? []

  return {
    storeName: nav?.storeName,
    primaryColor: nav?.primaryColor,
    navLogo: nav?.logo,
    navLinks: nav?.links,
    tagline: hero?.tagline,
    description: hero?.description,
    heroImage: hero?.bgImage,
    heroAlign: hero?.align,
    heroBtnPrimary: hero?.btnPrimary,
    heroBtnSecondary: hero?.btnSecondary,
    heroBadge1: hero?.badge1,
    heroBadge2: hero?.badge2,
    heroBadge3: hero?.badge3,
    aboutTitle: about?.heading,
    aboutBody: about?.story,
    aboutImage: about?.image,
    aboutHighlights: about?.highlights,
    testimonialText: testimonial?.text,
    featuresTitle: features?.title,
    featuresSubtitle: features?.subtitle,
    ctaTitle: cta?.title,
    ctaSubtitle: cta?.subtitle,
    ctaBtnText: cta?.btnText,
    ctaEmail: footer?.email,
    ctaPhone: footer?.phone,
    ctaAddress: footer?.address,
    socialFacebook: footer?.socialFacebook,
    socialInstagram: footer?.socialInstagram,
    socialX: footer?.socialX,
    stat1Value: items[0]?.value,
    stat1Label: items[0]?.label,
    stat2Value: items[1]?.value,
    stat2Label: items[1]?.label,
    stat3Value: items[2]?.value,
    stat3Label: items[2]?.label,
    stat4Value: items[3]?.value,
    stat4Label: items[3]?.label,
    stat5Value: items[4]?.value,
    stat5Label: items[4]?.label,
  }
}

export default function PartnerLandingPageView({
  partnerSlug,
  storefrontItem,
}: PartnerLandingPageViewProps) {
  const config = getPartnerStorefrontConfig(storefrontItem ?? undefined)
  const fields =
    ((storefrontItem?.payload ?? {}) as { fields?: Record<string, unknown> })
      .fields ?? {}
  const templateId = getFieldValue(fields, "landing_template_id") || "template4"
  const blocks = parseBlocks(fields.page_blocks)
  const content = mapCommonContent(blocks)

  if (!config) {
    return <LandingPage partnerSlug={partnerSlug} />
  }

  if (templateId === "template1") {
    return (
      <div className="min-h-screen bg-white">
        <Template1Component
          storeName={content.storeName}
          tagline={content.tagline}
          description={content.description}
          primaryColor={content.primaryColor}
          heroImage={content.heroImage}
          heroBtnPrimary={content.heroBtnPrimary}
          heroBtnSecondary={content.heroBtnSecondary}
          featuresTitle={content.featuresTitle}
          featuresSubtitle={content.featuresSubtitle}
          ctaTitle={content.ctaTitle}
          ctaSubtitle={content.ctaSubtitle}
          ctaBtnText={content.ctaBtnText}
          stat1Value={content.stat1Value}
          stat1Label={content.stat1Label}
          stat2Value={content.stat2Value}
          stat2Label={content.stat2Label}
          stat3Value={content.stat3Value}
          stat3Label={content.stat3Label}
          stat4Value={content.stat4Value}
          stat4Label={content.stat4Label}
          shopSlug={config.slug}
        />
      </div>
    )
  }

  if (templateId === "template2") {
    return (
      <div className="min-h-screen bg-white">
        <Template2Component
          storeName={content.storeName}
          tagline={content.tagline}
          description={content.description}
          primaryColor={content.primaryColor}
          heroImage={content.heroImage}
          heroBtnPrimary={content.heroBtnPrimary}
          heroBtnSecondary={content.heroBtnSecondary}
          featuresTitle={content.featuresTitle}
          featuresSubtitle={content.featuresSubtitle}
          ctaTitle={content.ctaTitle}
          ctaSubtitle={content.ctaSubtitle}
          ctaBtnText={content.ctaBtnText}
          testimonialText={content.testimonialText ?? content.aboutBody}
          stat1Value={content.stat1Value}
          stat1Label={content.stat1Label}
          stat2Value={content.stat2Value}
          stat2Label={content.stat2Label}
          stat3Value={content.stat3Value}
          stat3Label={content.stat3Label}
          stat4Value={content.stat4Value}
          stat4Label={content.stat4Label}
          shopSlug={config.slug}
        />
      </div>
    )
  }

  if (templateId === "template3") {
    return (
      <div className="min-h-screen bg-white">
        <Template3Component
          storeName={content.storeName}
          tagline={content.tagline}
          description={content.description}
          primaryColor={content.primaryColor}
          accentColor="#a78bfa"
          heroImage={content.heroImage}
          heroBtnPrimary={content.heroBtnPrimary}
          heroBtnSecondary={content.heroBtnSecondary}
          featuresTitle={content.featuresTitle}
          featuresSubtitle={content.featuresSubtitle}
          ctaTitle={content.ctaTitle}
          ctaSubtitle={content.ctaSubtitle}
          ctaBtnText={content.ctaBtnText}
          stat1Value={content.stat1Value}
          stat1Label={content.stat1Label}
          stat2Value={content.stat2Value}
          stat2Label={content.stat2Label}
          stat3Value={content.stat3Value}
          stat3Label={content.stat3Label}
          stat4Value={content.stat4Value}
          stat4Label={content.stat4Label}
          shopSlug={config.slug}
        />
      </div>
    )
  }

  if (blocks.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Template4Component shopSlug={config.slug} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Template4Component {...content} shopSlug={config.slug} />
    </div>
  )
}
