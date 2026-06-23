export type CmsItem = {
  id: number;
  type: string;
  key?: string | null;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  button_text?: string | null;
  payload?: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type HeroContent = {
  eyebrow: string;
  title: string;
  body: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  signatureLabel: string;
  stats: Array<{ value: string; label: string }>;
  carouselSlides: Array<{ src: string; alt: string; label: string }>;
};

export type ProcessStepContent = {
  title: string;
  description: string;
  stepNumber?: string;
};

export type ServiceContent = {
  id: string;
  serviceLabel: string;
  title: string;
  description: string;
  bullets: string[];
  image?: string;
};

export type TestimonialContent = {
  name: string;
  role: string;
  quote: string;
  image?: string;
};

export type DreamBuildBlogPost = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  readTime: string;
  image?: string;
  body?: string;
  designBrief?: string;
  takeaways?: string[];
  sections?: Array<{ title: string; body: string }>;
  galleryImages?: string[];
  faq?: Array<{ question: string; answer: string }>;
};

export type ServicesCtaContent = {
  text: string;
  buttonText: string;
  buttonUrl: string;
};

export type ServicesHeaderContent = {
  eyebrow: string;
  title: string;
  description: string;
};

export type GalleryContent = {
  title: string;
  tone?: string;
  image?: string;
  alt?: string;
  description?: string;
  address?: string;
};

export type DreamBuildProject = {
  id: string;
  title: string;
  tag: string;
  size: "short" | "tall";
  image?: string;
  location: string;
  scopeLabel: string;
  scopeItems: string[];
  timeline: string;
  description: string;
  story: string;
};

export type GalleryHeaderContent = {
  eyebrow: string;
  title: string;
  ctaText: string;
  ctaUrl: string;
};

export type ProjectsHeaderContent = {
  eyebrow: string;
  title: string;
};

export type DreamBuildContent = {
  hero: HeroContent;
  services: ServiceContent[];
  servicesHeader: ServicesHeaderContent;
  servicesCta: ServicesCtaContent;
  projects: DreamBuildProject[];
  projectsHeader: ProjectsHeaderContent;
  galleryItems: GalleryContent[];
  galleryHeader: GalleryHeaderContent;
  processSteps: ProcessStepContent[];
  testimonials: TestimonialContent[];
  blogPosts: DreamBuildBlogPost[];
  contact: {
    title: string;
    body: string;
    email: string;
    phone?: string;
    address: string;
    responseTime: string;
    statusBadge: string;
  };
};

const emptyHero: HeroContent = {
  eyebrow: "",
  title: "",
  body: "",
  primaryButtonText: "",
  primaryButtonUrl: "#services",
  secondaryButtonText: "",
  secondaryButtonUrl: "/projects",
  signatureLabel: "",
  stats: [],
  carouselSlides: [],
};

const defaultContact = {
  title: "Ready to build something remarkable?",
  body:
    "Tell us about your space and what you're looking for. We'll get back to you within 24 hours to set up a free consultation.",
  email: "hello@dreambuild.studio",
  phone: "+63 997 875 3004",
  address: "Metro Manila, Philippines",
  responseTime: "Within 24 hours",
  statusBadge: "Currently accepting new projects",
};

const defaultServicesCta: ServicesCtaContent = {
  text: "Not sure which service fits your project?",
  buttonText: "Book a Free Consult",
  buttonUrl: "#contact",
};

const defaultServicesHeader: ServicesHeaderContent = {
  eyebrow: "Interior Services",
  title: "What we do best.",
  description: "Three focused service areas, each designed to move your space forward.",
};

const defaultGalleryHeader: GalleryHeaderContent = {
  eyebrow: "Interior Gallery",
  title: "A curated look at our aesthetic.",
  ctaText: "See All Projects",
  ctaUrl: "/projects",
};

const defaultProjectsHeader: ProjectsHeaderContent = {
  eyebrow: "Featured Projects",
  title: "Spaces we've shaped and styled.",
};

const contentTypes = [
  "dreambuild-hero",
  "dreambuild-services",
  "dreambuild-projects",
  "dreambuild-blogs",
  "dreambuild-testimonials",
  "dreambuild-gallery",
  "dreambuild-process",
  "dreambuild-contact",
] as const;

export const DREAMBUILD_CONTENT_TAG = "dreambuild-content";
const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const textList = (value: unknown, fallback: string[]) => {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
    return items.length ? items : fallback;
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(/\\r?\\n/g, "\n");

    if (normalized.startsWith("[") && normalized.endsWith("]")) {
      try {
        const parsed = JSON.parse(normalized);
        if (Array.isArray(parsed)) {
          const items = parsed
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .map((item) => item.trim());
          return items.length ? items : fallback;
        }
      } catch {
        // Fall back to line parsing for older CMS values that only look like JSON.
      }
    }

    const items = normalized.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    return items.length ? items : fallback;
  }

  return fallback;
};

const pairsList = (value: unknown, fallback: Array<{ title: string; body: string }>) => {
  const lines = textList(value, []);
  const items = lines
    .map((line, index) => {
      const [title, ...bodyParts] = line.split("|");
      return {
        title: title?.trim() || `Section ${index + 1}`,
        body: bodyParts.join("|").trim(),
      };
    })
    .filter((item) => item.title && item.body);

  return items.length ? items : fallback;
};

const legacyHeroImageMarkers = [
  "images.unsplash.com/photo-1618221195710",
  "images.unsplash.com/photo-1631679706909",
  "images.unsplash.com/photo-1556909114",
  "images.unsplash.com/photo-1600585154526",
];

const isLegacyHeroImageUrl = (value: string) =>
  legacyHeroImageMarkers.some((marker) => value.includes(marker));

const getApiBase = () => {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_LARAVEL_API_URL ||
    process.env.LARAVEL_API_URL ||
    "http://localhost:8000";
  return raw.replace(/\/+$/, "");
};

async function fetchCmsItems(type: (typeof contentTypes)[number]): Promise<CmsItem[]> {
  try {
    const response = await fetch(`${getApiBase()}/api/web-pages/${type}`, {
      cache: "no-store",
    });

    if (!response.ok) return [];
    const data = (await response.json()) as { items?: CmsItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

const sortByOrder = (a: CmsItem, b: CmsItem) =>
  a.sort_order - b.sort_order || a.id - b.id;

const mapGalleryItems = (items: CmsItem[]): GalleryContent[] =>
  items
    .filter((item) => item.is_active && text(item.image_url, ""))
    .sort(sortByOrder)
    .map((item, index) => {
      const payload = item.payload ?? {};

      return {
        title: text(item.title, `Gallery image ${index + 1}`),
        image: text(item.image_url, ""),
        alt: text(payload.alt, item.title || `Gallery image ${index + 1}`),
        description: text(payload.description, ""),
        address: text(payload.address, ""),
        tone: text(payload.tone, ""),
      };
    });

const legacyProjectSampleKeys = new Set([
  "warm-minimalist-residence",
  "soft-luxe-condo-suite",
  "contemporary-family-home",
]);

const legacyProjectSampleIds = new Set([105, 106, 107]);

const isLegacyProjectSample = (item: CmsItem) => {
  const key = text(item.key, "").toLowerCase();
  const createdAt = text(item.created_at, "");
  const updatedAt = text(item.updated_at, "");
  // Hide only pristine seeded samples. Once an admin edits one, updated_at moves
  // past the seed date and it must render on the site like any other project.
  const isPristineSeed =
    createdAt.startsWith("2026-06-15") && updatedAt.startsWith("2026-06-15");

  return (
    isPristineSeed &&
    (legacyProjectSampleIds.has(item.id) || legacyProjectSampleKeys.has(key))
  );
};

const mapProjects = (items: CmsItem[]): DreamBuildProject[] =>
  items
    .filter((item) => {
      // Only the dedicated projects-header record carries the section heading.
      // Don't exclude real projects just because they still hold stale
      // section_eyebrow/section_title keys from an earlier save.
      return (
        item.is_active &&
        item.key !== "projects-header" &&
        !isLegacyProjectSample(item)
      );
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((item, index) => {
      const payload = item.payload ?? {};
      const title = text(item.title, `Featured project ${index + 1}`);
      const baseId = slugify(text(item.key, "") || title) || "project";
      const id = `${baseId}-${item.id}`;
      const scopeItems = textList(
        payload.scope_items,
        textList(payload.scope, textList(payload.scope_label, [])),
      );
      const scopeLabel = scopeItems.join(" + ");

      return {
        id,
        title,
        tag: text(payload.tag, ""),
        size: text(payload.card_size, index % 2 === 0 ? "tall" : "short") === "tall" ? "tall" : "short",
        image: text(item.image_url, ""),
        location: text(payload.city_area, text(payload.location, "")),
        scopeLabel,
        scopeItems,
        timeline: text(payload.timeline, ""),
        description: text(item.subtitle, text(item.body, "")),
        story: text(item.body, ""),
      };
    });

const mapServices = (items: CmsItem[]): ServiceContent[] => {
  const activeItems = items
    .filter((item) => item.is_active)
    .sort(sortByOrder);

  const sharedServiceLabel =
    activeItems
      .map((item) => text(item.payload?.service_label, ""))
      .find(Boolean) || "Solution";

  return activeItems.map((item, index) => {
    const payload = item.payload ?? {};
    return {
      id: String(index + 1).padStart(2, "0"),
      serviceLabel: text(payload.service_label, sharedServiceLabel),
      title: text(item.title, ""),
      description: text(item.body, ""),
      bullets: textList(payload.bullets, []),
      image: text(item.image_url, ""),
    };
  });
};

const mapProcessSteps = (items: CmsItem[]): ProcessStepContent[] =>
  items
    .filter((item) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => {
      const payload = item.payload ?? {};

      return {
        stepNumber: text(payload.step_number, String(index + 1).padStart(2, "0")),
        title: text(item.title, ""),
        description: text(item.body, ""),
      };
    });

export async function getDreamBuildContent(): Promise<DreamBuildContent> {
  const [
    heroItems,
    serviceItems,
    projectItems,
    blogItems,
    testimonialItems,
    galleryCmsItems,
    processItems,
    contactItems,
  ] = await Promise.all(contentTypes.map((type) => fetchCmsItems(type)));

  const heroItem = heroItems
    .filter((item) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || b.id - a.id)[0];
  const heroPayload = heroItem?.payload ?? {};
  const servicesHeaderItem =
    serviceItems.find((item) => item.payload?.section_eyebrow || item.payload?.section_title || item.payload?.section_description || item.payload?.cta_text || item.payload?.cta_button_text || item.button_text) ??
    serviceItems[0];
  const servicesHeaderPayload = servicesHeaderItem?.payload ?? {};
  const projectsHeaderItem =
    projectItems.find((item) => item.key === "projects-header" || item.payload?.section_eyebrow || item.payload?.section_title) ??
    projectItems[0];
  const projectsHeaderPayload = projectsHeaderItem?.payload ?? {};
  const galleryHeaderItem =
    galleryCmsItems.find((item) => item.payload?.section_eyebrow || item.payload?.section_title || item.payload?.cta_text || item.payload?.cta_url) ??
    galleryCmsItems[0];
  const galleryHeaderPayload = galleryHeaderItem?.payload ?? {};
  const carouselUrls = [
    ...textList(heroPayload.carousel_images, []),
    ...textList(heroPayload.carouselImages, []),
    ...textList(heroPayload.images, []),
    ...textList(heroPayload.image_urls, []),
    text(heroItem?.image_url, ""),
    text(heroPayload.image_url, ""),
  ]
    .filter(Boolean)
    .filter((url) => !isLegacyHeroImageUrl(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);
  const hero: HeroContent = heroItem
    ? {
        eyebrow: text(heroPayload.eyebrow, ""),
        title: text(heroItem.title, ""),
        body: text(heroItem.body, ""),
        primaryButtonText: text(heroPayload.primary_button_text, ""),
        primaryButtonUrl: "#services",
        secondaryButtonText: text(heroPayload.secondary_button_text, ""),
        secondaryButtonUrl: "/projects",
        signatureLabel: text(heroPayload.signature_label, ""),
        stats: [
          { value: text(heroPayload.stat_1_value, ""), label: text(heroPayload.stat_1_label, "") },
          { value: text(heroPayload.stat_2_value, ""), label: text(heroPayload.stat_2_label, "") },
          { value: text(heroPayload.stat_3_value, ""), label: text(heroPayload.stat_3_label, "") },
        ].filter((item) => item.value || item.label),
        carouselSlides: carouselUrls.map((src, index) => ({
          src,
          alt: text((heroPayload as Record<string, unknown>)[`slide_${index + 1}_alt`], heroItem.title || `DreamBuild hero image ${index + 1}`),
          label: text((heroPayload as Record<string, unknown>)[`slide_${index + 1}_label`], ""),
        })),
      }
    : emptyHero;

  return {
    hero,
    services: mapServices(serviceItems),
    servicesHeader: {
      eyebrow: text(servicesHeaderPayload.section_eyebrow, defaultServicesHeader.eyebrow),
      title: text(servicesHeaderPayload.section_title, defaultServicesHeader.title),
      description: text(servicesHeaderPayload.section_description, defaultServicesHeader.description),
    },
    servicesCta: {
      text: text(servicesHeaderPayload.cta_text, defaultServicesCta.text),
      buttonText: text(servicesHeaderPayload.cta_button_text, text(servicesHeaderItem?.button_text, defaultServicesCta.buttonText)),
      buttonUrl: "#contact",
    },
    projects: mapProjects(projectItems),
    projectsHeader: {
      eyebrow: text(projectsHeaderPayload.section_eyebrow, defaultProjectsHeader.eyebrow),
      title: text(projectsHeaderPayload.section_title, defaultProjectsHeader.title),
    },
    blogPosts: blogItems
      .filter((item) => item.is_active)
      .sort(sortByOrder)
      .map((item) => {
        const payload = item.payload ?? {};
        const sections = pairsList(payload.sections, []);
        const faq = pairsList(payload.faq, []).map((entry) => ({
          question: entry.title,
          answer: entry.body,
        }));
        const title = text(item.title, "");

        return {
          id: text(payload.slug, slugify(title) || String(item.id)),
          title,
          category: text(payload.category, ""),
          excerpt: text(item.subtitle, ""),
          body: text(item.body, ""),
          image: text(item.image_url, ""),
          date: text(payload.date, ""),
          readTime: text(payload.read_time, ""),
          designBrief: text(payload.design_brief, ""),
          takeaways: textList(payload.takeaways, []),
          sections,
          galleryImages: textList(payload.gallery_images, []),
          faq,
        };
      }),
    testimonials: testimonialItems
      .filter((item) => item.is_active)
      .sort(sortByOrder)
      .map((item) => {
        const payload = item.payload ?? {};
        return {
          name: text(payload.client_name, text(item.title, "")),
          role: text(payload.client_role, ""),
          quote: text(item.body, ""),
          image: text(item.image_url, ""),
        };
      }),
    galleryItems: mapGalleryItems(galleryCmsItems),
    galleryHeader: {
      eyebrow: text(galleryHeaderPayload.section_eyebrow, defaultGalleryHeader.eyebrow),
      title: text(galleryHeaderPayload.section_title, defaultGalleryHeader.title),
      ctaText: text(galleryHeaderPayload.cta_text, defaultGalleryHeader.ctaText),
      ctaUrl: text(galleryHeaderPayload.cta_url, defaultGalleryHeader.ctaUrl),
    },
    processSteps: mapProcessSteps(processItems),
    contact: contactItems[0]
      ? {
          title: text(contactItems[0].title, defaultContact.title),
          body: text(contactItems[0].body, defaultContact.body),
          email: text(contactItems[0].payload?.email, defaultContact.email),
          phone: text(contactItems[0].payload?.phone, defaultContact.phone),
          address: text(contactItems[0].payload?.address, defaultContact.address),
          responseTime: text(contactItems[0].payload?.response_time, defaultContact.responseTime),
          statusBadge: text(contactItems[0].payload?.status_badge, defaultContact.statusBadge),
        }
      : defaultContact,
  };
}
