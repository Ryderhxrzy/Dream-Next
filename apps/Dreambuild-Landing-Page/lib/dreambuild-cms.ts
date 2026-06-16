import {
  blogPosts,
  galleryItems,
  processSteps,
  services,
  stats,
  testimonials,
} from "@/lib/landing-data";

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
  stats: typeof stats;
  carouselSlides: Array<{ src: string; alt: string; label: string }>;
};

export type ProcessStepContent = (typeof processSteps)[number] & {
  stepNumber?: string;
};

export type DreamBuildBlogPost = (typeof blogPosts)[number] & {
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

export type GalleryContent = (typeof galleryItems)[number] & {
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
  image: string;
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

export type DreamBuildContent = {
  hero: HeroContent;
  services: typeof services;
  servicesHeader: ServicesHeaderContent;
  servicesCta: ServicesCtaContent;
  projects: DreamBuildProject[];
  galleryItems: GalleryContent[];
  galleryHeader: GalleryHeaderContent;
  processSteps: ProcessStepContent[];
  testimonials: typeof testimonials;
  blogPosts: DreamBuildBlogPost[];
  contact: {
    title: string;
    body: string;
    email: string;
    phone?: string;
    address: string;
  };
};

const defaultHeroSlides = [
  {
    src: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80",
    alt: "Modern living room with warm neutrals",
    label: "Living Room",
  },
  {
    src: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
    alt: "Minimalist bedroom interior",
    label: "Bedroom",
  },
  {
    src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    alt: "Clean kitchen design",
    label: "Kitchen",
  },
  {
    src: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    alt: "Elegant dining area",
    label: "Dining",
  },
];

const defaultHero: HeroContent = {
  eyebrow: "Interior Design Studio",
  title: "Refined interiors for homes that seek clarity and character",
  body:
    "Dreambuild creates calm, polished interiors through thoughtful planning, clean material stories, and a modern design language that feels elevated without becoming cold.",
  primaryButtonText: "Explore Services",
  primaryButtonUrl: "#services",
  secondaryButtonText: "View Projects",
  secondaryButtonUrl: "/projects",
  signatureLabel: "Warm neutrals with refined, modern polish",
  stats,
  carouselSlides: defaultHeroSlides,
};

const defaultContact = {
  title: "Ready to build something remarkable?",
  body:
    "Tell us about your space and what you're looking for. We'll get back to you within 24 hours to set up a free consultation.",
  email: "hello@dreambuild.studio",
  address: "Metro Manila, Philippines",
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
    const items = value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
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

const byIndex = <T>(items: CmsItem[], defaults: readonly T[], mapper: (item: CmsItem, fallback: T, index: number) => T): T[] => {
  if (!items.length) return [...defaults];
  return defaults.map((fallback, index) => {
    const item = items[index];
    return item ? mapper(item, fallback, index) : fallback;
  });
};

const mapGalleryItems = (items: CmsItem[]): GalleryContent[] =>
  items
    .filter((item) => item.is_active && text(item.image_url, ""))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((item, index) => {
      const payload = item.payload ?? {};
      const fallback = galleryItems[index % galleryItems.length] ?? galleryItems[0];

      return {
        ...fallback,
        title: text(item.title, `Gallery image ${index + 1}`),
        image: text(item.image_url, ""),
        alt: text(payload.alt, item.title || `Gallery image ${index + 1}`),
        description: text(payload.description, ""),
        address: text(payload.address, ""),
        tone: text(payload.tone, fallback.tone) as typeof fallback.tone,
      };
    });

const mapProjects = (items: CmsItem[]): DreamBuildProject[] =>
  items
    .filter((item) => item.is_active && text(item.title, "") && text(item.image_url, ""))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((item, index) => {
      const payload = item.payload ?? {};
      const title = text(item.title, `Featured project ${index + 1}`);
      const id = slugify(text(item.key, "") || title) || `project-${item.id}`;
      const scopeItems = textList(
        payload.scope_items,
        textList(payload.scope_label, ["Design", "Supply", "Installation"]),
      );
      const scopeLabel = scopeItems.join(" + ");

      return {
        id,
        title,
        tag: text(payload.tag, "Full Solution - Design to Installation"),
        size: text(payload.card_size, index % 2 === 0 ? "tall" : "short") === "tall" ? "tall" : "short",
        image: text(item.image_url, ""),
        location: text(payload.city_area, text(payload.location, "Metro Manila")),
        scopeLabel,
        scopeItems,
        timeline: text(payload.timeline, ""),
        description: text(item.subtitle, text(item.body, "A closer look at the DreamBuild interior process.")),
        story: text(item.body, "A closer look at the DreamBuild interior process."),
      };
    });

const mapServices = (items: CmsItem[]): typeof services => {
  const seen = new Set<string>();
  const activeItems = items
    .filter((item) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .filter((item, index) => {
      const key = text(item.payload?.service_number, "") || item.key || `index:${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (!activeItems.length) return [...services];

  const sharedServiceLabel =
    activeItems
      .map((item) => text(item.payload?.service_label, ""))
      .find(Boolean) || services[0].serviceLabel;

  return activeItems.map((item, index) => {
    const fallback = services[index] ?? services[services.length - 1];
    const payload = item.payload ?? {};
    return {
      ...fallback,
      id: String(index + 1).padStart(2, "0"),
      serviceLabel: text(payload.service_label, sharedServiceLabel),
      title: text(item.title, fallback.title),
      description: text(item.body, fallback.description),
      bullets: textList(payload.bullets, fallback.bullets),
    };
  }) as typeof services;
};

const mapProcessSteps = (items: CmsItem[]): ProcessStepContent[] => {
  if (!items.length) return [...processSteps];

  return items
    .filter((item) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => {
      const fallback = processSteps[index] ?? processSteps[processSteps.length - 1];
      const payload = item.payload ?? {};

      return {
        ...fallback,
        stepNumber: text(payload.step_number, String(index + 1).padStart(2, "0")),
        title: text(item.title, fallback.title),
        description: text(item.body, fallback.description),
      };
    });
};

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

  const heroItem = heroItems[0];
  const heroPayload = heroItem?.payload ?? {};
  const servicesHeaderItem =
    serviceItems.find((item) => item.payload?.section_eyebrow || item.payload?.section_title || item.payload?.section_description) ??
    serviceItems[0];
  const servicesHeaderPayload = servicesHeaderItem?.payload ?? {};
  const galleryHeaderItem =
    galleryCmsItems.find((item) => item.payload?.section_eyebrow || item.payload?.section_title || item.payload?.cta_text || item.payload?.cta_url) ??
    galleryCmsItems[0];
  const galleryHeaderPayload = galleryHeaderItem?.payload ?? {};
  const carouselUrls = textList(heroPayload.carousel_images, []).filter(Boolean);
  const hero: HeroContent = heroItem
    ? {
        eyebrow: text(heroPayload.eyebrow, defaultHero.eyebrow),
        title: text(heroItem.title, defaultHero.title),
        body: text(heroItem.body, defaultHero.body),
        primaryButtonText: text(heroPayload.primary_button_text, defaultHero.primaryButtonText),
        primaryButtonUrl: text(heroPayload.primary_button_url, defaultHero.primaryButtonUrl),
        secondaryButtonText: text(heroPayload.secondary_button_text, defaultHero.secondaryButtonText),
        secondaryButtonUrl: text(heroPayload.secondary_button_url, defaultHero.secondaryButtonUrl),
        signatureLabel: text(heroPayload.signature_label, defaultHero.signatureLabel),
        stats: [
          { value: text(heroPayload.stat_1_value, defaultHero.stats[0].value), label: text(heroPayload.stat_1_label, defaultHero.stats[0].label) },
          { value: text(heroPayload.stat_2_value, defaultHero.stats[1].value), label: text(heroPayload.stat_2_label, defaultHero.stats[1].label) },
          { value: text(heroPayload.stat_3_value, defaultHero.stats[2].value), label: text(heroPayload.stat_3_label, defaultHero.stats[2].label) },
        ],
        carouselSlides: defaultHeroSlides.map((slide, index) => ({
          ...slide,
          src: carouselUrls[index] || slide.src,
          label: text((heroPayload as Record<string, unknown>)[`slide_${index + 1}_label`], slide.label),
        })),
      }
    : defaultHero;

  return {
    hero,
    services: mapServices(serviceItems),
    servicesHeader: {
      eyebrow: text(servicesHeaderPayload.section_eyebrow, defaultServicesHeader.eyebrow),
      title: text(servicesHeaderPayload.section_title, defaultServicesHeader.title),
      description: text(servicesHeaderPayload.section_description, defaultServicesHeader.description),
    },
    servicesCta: defaultServicesCta,
    projects: mapProjects(projectItems),
    blogPosts: byIndex(blogItems, blogPosts, (item, fallback) => {
      const payload = item.payload ?? {};
      const sections = pairsList(payload.sections, []);
      const faq = pairsList(payload.faq, []).map((item) => ({
        question: item.title,
        answer: item.body,
      }));

      return {
        ...fallback,
        id: text(payload.slug, fallback.id),
        title: text(item.title, fallback.title),
        category: text(payload.category, fallback.category),
        excerpt: text(item.subtitle, fallback.excerpt),
        body: text(item.body, ""),
        image: text(item.image_url, ""),
        date: text(payload.date, fallback.date),
        readTime: text(payload.read_time, fallback.readTime),
        designBrief: text(payload.design_brief, ""),
        takeaways: textList(payload.takeaways, []),
        sections,
        galleryImages: textList(payload.gallery_images, []),
        faq,
      };
    }),
    testimonials: byIndex(testimonialItems, testimonials, (item, fallback) => {
      const payload = item.payload ?? {};
      return {
        ...fallback,
        name: text(payload.client_name, item.title || fallback.name),
        role: text(payload.client_role, fallback.role),
        quote: text(item.body, fallback.quote),
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
          phone: text(contactItems[0].payload?.phone, ""),
          address: text(contactItems[0].payload?.address, defaultContact.address),
        }
      : defaultContact,
  };
}
