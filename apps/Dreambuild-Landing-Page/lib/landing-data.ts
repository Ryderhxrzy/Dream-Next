export const navigation = [
  { label: "About", href: "/about" },
  { label: "Services", href: "#services" },
  { label: "Projects", href: "/projects" },
  { label: "Blogs", href: "/blogs" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" },
];

export const stats = [
  { value: "150+", label: "interior concepts explored" },
  { value: "48", label: "spaces designed and styled" },
  { value: "10", label: "signature palette directions" },
];

export const services = [
  {
    id: "01",
    serviceLabel: "Solution",
    title: "Interior Design",
    description:
      "Space planning, material direction, and a complete visual language - designed around how you actually live, and engineered to be sourced and installed without compromise.",
    bullets: [
      "Space planning with lifestyle-based zoning",
      "Material, color, and finish coordination",
      "Furniture, lighting, and styling direction",
    ],
    accent: "from-[#f5f2ee] via-[#e6ddd4] to-[#c9b8aa]",
    panel: "from-[#dad0c6] via-[#f7f4ef] to-[#c1b1a3]",
  },
  {
    id: "02",
    serviceLabel: "Solution",
    title: "Sourcing & Supply",
    description:
      "Two decades of direct factory relationships through our proprietary international supply chain mean designer-grade furniture, lighting, and finishing materials at prices showrooms can't touch.",
    bullets: [
      "Direct-from-factory furniture, lighting, and fixtures",
      "Finishing materials, hardware, and soft furnishings",
      "Consolidated shipping, QC inspection, and delivery",
    ],
    accent: "from-[#fcfaf7] via-[#e4dad0] to-[#b7a392]",
    panel: "from-[#f2ede6] via-[#d0c0b2] to-[#9f8a79]",
  },
  {
    id: "03",
    serviceLabel: "Solution",
    title: "Installation & Finishing",
    description:
      "Our crews install, assemble, and style everything we design and supply, then hand you a home that's photo-ready on day one.",
    bullets: [
      "Furniture, fixture, and built-in installation",
      "Curtains, lighting, and accessory fit-out",
      "Final styling, QC walkthrough, and turnover",
    ],
    accent: "from-[#ddd1c6] via-[#f8f5f1] to-[#eee5db]",
    panel: "from-[#baa797] via-[#ded3c8] to-[#faf7f2]",
  },
];

export const projects = [
  {
    title: "Warm Minimalist Residence",
    tag: "Residential Interior",
    size: "tall",
  },
  {
    title: "Soft Luxe Condo Suite",
    tag: "Urban Living",
    size: "short",
  },
  {
    title: "Contemporary Family Home",
    tag: "Full Home Design",
    size: "short",
  },
  {
    title: "Neutral Entertaining Space",
    tag: "Living and Dining",
    size: "tall",
  },
];

export const galleryItems = [
  { title: "Living Room Styling", tone: "dark" },
  { title: "Dining Space Layers", tone: "light" },
  { title: "Bedroom Material Story", tone: "gold" },
  { title: "Modern Kitchen Detail", tone: "soft" },
  { title: "Lounge Accent Composition", tone: "dark" },
  { title: "Warm Neutral Interior", tone: "light" },
];

export const processSteps = [
  {
    title: "Discover",
    description:
      "We collect references, understand how the client lives, and define the emotional tone the home should carry.",
  },
  {
    title: "Shape",
    description:
      "Layouts, materials, finishes, and furniture language are refined into one coherent interior direction.",
  },
  {
    title: "Deliver",
    description:
      "Selections are organized into a presentation-ready design system that supports implementation with clarity.",
  },
];

export const testimonials = [
  {
    name: "Angela M.",
    role: "Homeowner",
    quote:
      "The space finally feels elevated but still personal. Every corner looks calm, intentional, and easy to live in.",
  },
  {
    name: "Daniel R.",
    role: "Condo Client",
    quote:
      "They translated our vague ideas into something polished and cohesive. The material palette alone changed the whole mood.",
  },
];

export const blogPosts = [
  {
    id: "warm-modern-living-room",
    title: "How To Build A Warm Modern Living Room",
    category: "Styling Guide",
    excerpt:
      "A practical guide to layering neutrals, textures, and statement pieces without making the room feel heavy.",
    date: "March 15, 2024",
    readTime: "5 min read",
    designBrief:
      "Build the room around one warm anchor material, then balance it with breathable spacing, tactile surfaces, and low-glare light.",
    takeaways: [
      "Start with a calm base palette before adding accents",
      "Repeat wood or woven tones at least three times",
      "Use lighting layers instead of one bright ceiling source",
    ],
    sections: [
      {
        title: "Start With The Anchor",
        body:
          "Choose one dominant material story first: oak, walnut, rattan, linen, or warm stone. Repeating that story makes the space feel intentional instead of randomly decorated.",
      },
      {
        title: "Layer Texture Before Color",
        body:
          "Warm modern rooms do not need many colors. They need matte, woven, brushed, and soft surfaces working together so neutral pieces still feel dimensional.",
      },
      {
        title: "Keep The Layout Conversational",
        body:
          "Pull seating away from the walls when possible, keep paths clear, and let the coffee table connect the main pieces without crowding the center.",
      },
    ],
    faq: [
      {
        question: "What makes a living room feel warm but still modern?",
        answer:
          "A restrained palette, repeated natural materials, simple silhouettes, and layered lighting create warmth without visual clutter.",
      },
      {
        question: "Should every furniture piece match?",
        answer:
          "No. The room feels more refined when finishes relate to each other, but pieces still vary in texture, shape, or scale.",
      },
    ],
  },
  {
    id: "small-spaces-premium",
    title: "Interior Finishes That Make Small Spaces Feel Premium",
    category: "Design Tips",
    excerpt:
      "Simple finish decisions that elevate condos and compact homes while keeping the look clean and spacious.",
    date: "March 8, 2024",
    readTime: "4 min read",
    designBrief:
      "Compact homes feel elevated when the finishes are consistent, tactile, and edited down to a few strong decisions.",
    takeaways: [
      "Use fewer finishes with better repetition",
      "Choose vertical storage that looks built-in",
      "Avoid glossy overload in small rooms",
    ],
    sections: [
      {
        title: "Edit The Finish Palette",
        body:
          "Limit the room to two main finishes and one accent. This creates visual calm and helps inexpensive pieces feel more curated.",
      },
      {
        title: "Use Height For Storage",
        body:
          "Tall cabinets, floating shelves, and vertical wall details draw the eye upward while keeping the floor open.",
      },
      {
        title: "Make Utility Look Intentional",
        body:
          "Small spaces need hardworking pieces. Choose storage that has a clear design language so practical items do not look temporary.",
      },
    ],
  },
  {
    id: "before-renovate",
    title: "Before You Renovate: Design Decisions To Finalize Early",
    category: "Renovation",
    excerpt:
      "The key layout, lighting, and material choices you should settle before build-out starts.",
    date: "February 28, 2024",
    readTime: "6 min read",
    designBrief:
      "The best renovation work happens when the invisible decisions are settled before construction starts.",
    takeaways: [
      "Finalize traffic flow before buying furniture",
      "Lock major lighting positions early",
      "Decide built-ins before wall and outlet work",
    ],
    sections: [
      {
        title: "Plan The Daily Route",
        body:
          "Map how people move through the space at busy hours. Door swings, dining clearance, and storage access matter more than a beautiful mood board.",
      },
      {
        title: "Decide Lighting Before Ceilings",
        body:
          "Ambient, task, and accent lighting should be planned before ceiling work begins so the final space feels layered.",
      },
      {
        title: "Resolve Built-Ins Early",
        body:
          "Cabinets, wardrobes, media walls, and desks affect outlets, measurements, wall finishes, and budget timing.",
      },
    ],
  },
  {
    id: "neutral-palette-guide",
    title: "The Complete Guide to Neutral Color Palettes",
    category: "Color Theory",
    excerpt:
      "Understanding undertones, creating depth with neutrals, and avoiding the common mistakes that make spaces feel flat.",
    date: "February 20, 2024",
    readTime: "7 min read",
  },
  {
    id: "lighting-layers",
    title: "Mastering Lighting Layers in Modern Homes",
    category: "Lighting Design",
    excerpt:
      "How to combine ambient, task, and accent lighting for a space that feels both functional and atmospheric.",
    date: "February 12, 2024",
    readTime: "5 min read",
  },
  {
    id: "sustainable-materials",
    title: "Sustainable Materials That Still Look Luxurious",
    category: "Sustainability",
    excerpt:
      "Eco-conscious choices that deliver on aesthetics without compromising your design vision or budget.",
    date: "February 5, 2024",
    readTime: "6 min read",
  },
];

export const allProjects = [
  {
    id: "warm-minimalist-residence",
    title: "Warm Minimalist Residence",
    tag: "Residential Interior",
    location: "Metro Manila",
    year: "2024",
    description: "A serene family home featuring warm oak tones, textured plaster walls, and curated furniture that balances comfort with refined simplicity.",
    scope: ["Full Interior Design", "Furniture Curation", "Lighting Design"],
  },
  {
    id: "soft-luxe-condo",
    title: "Soft Luxe Condo Suite",
    tag: "Urban Living",
    location: "Makati City",
    year: "2024",
    description: "A compact urban retreat transformed with soft textures, brass accents, and a neutral palette that maximizes perceived space.",
    scope: ["Space Planning", "Material Selection", "Styling"],
  },
  {
    id: "contemporary-family-home",
    title: "Contemporary Family Home",
    tag: "Full Home Design",
    location: "Quezon City",
    year: "2023",
    description: "A complete home transformation focusing on open-plan living, natural light optimization, and family-friendly durability.",
    scope: ["Full Interior Design", "Renovation Consultation", "Furniture Design"],
  },
  {
    id: "neutral-entertaining-space",
    title: "Neutral Entertaining Space",
    tag: "Living and Dining",
    location: "Bonifacio Global City",
    year: "2023",
    description: "An elegant living and dining area designed for hosting, with statement lighting and a cohesive material story.",
    scope: ["Living Room Design", "Dining Room Design", "Lighting Layout"],
  },
  {
    id: "modern-kitchen-renovation",
    title: "Modern Kitchen Renovation",
    tag: "Kitchen Design",
    location: "San Juan",
    year: "2023",
    description: "A dated kitchen reimagined with sleek cabinetry, integrated appliances, and a waterfall island that anchors the space.",
    scope: ["Kitchen Design", "Cabinetry Design", "Material Coordination"],
  },
  {
    id: "serene-bedroom-suite",
    title: "Serene Bedroom Suite",
    tag: "Bedroom Design",
    location: "Alabang",
    year: "2023",
    description: "A master suite sanctuary with layered textiles, indirect lighting, and a calm color palette promoting rest and relaxation.",
    scope: ["Bedroom Design", "Closet Design", "Lighting Design"],
  },
];
