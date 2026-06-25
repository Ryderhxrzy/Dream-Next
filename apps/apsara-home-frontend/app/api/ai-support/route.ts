import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/libs/auth"
import { getPartnerStorefrontConfig } from "@/libs/partnerStorefront"
import type { WebPageItem } from "@/store/api/webPagesApi"

type Product = {
  id: number
  name: string
  description?: string | null
  pd_description?: string | null
  catid?: number | null
  pd_catid?: number | string | null
  category_id?: number | string | null
  priceSrp?: number | string | null
  pd_price_srp?: number | string | null
  priceDp?: number | string | null
  pd_price_dp?: number | string | null
  priceMember?: number | string | null
  pd_price_member?: number | string | null
  qty?: number | string | null
  pd_qty?: number | string | null
  image?: string | null
  pd_image?: string | null
  brand?: string | null
  pd_brand?: string | null
  bestseller?: boolean | number | string
  pd_bestseller?: boolean | number | string
  musthave?: boolean | number | string
  pd_musthave?: boolean | number | string
  salespromo?: boolean | number | string
  pd_salespromo?: boolean | number | string
}

type ProductCard = {
  id: number
  name: string
  image?: string | null
  price: string
  description?: string | null
  url: string
  brand?: string | null
  stock?: number | null
}

type Category = {
  id: number
  cat_id?: number | string | null
  name: string
  cat_name?: string | null
  description?: string | null
}

type RagChunk = {
  title: string
  type: string
  scope: string
  partner_slug?: string | null
  content: string
  score?: number | null
}

type PaymentMethod = {
  key: string
  label: string
  aliases?: string[]
  providers?: Array<{
    key: string
    label: string
    aliases?: string[]
  }>
}

type SystemSettings = {
  system_name?: string
  company_name?: string
  support_email?: string
  contact_number?: string
  address?: string
  branches?: string
  timezone?: string
  currency?: string
  language?: string
  enable_test_payments?: boolean
  enable_manual_checkout_mode?: boolean
  updated_at?: string | null
}

type SimilarImageResponse = {
  products?: ProductCard[]
  message?: string
}

type AiSupportPayload = {
  message: string
  images: string[]
}

type AiSupportError = {
  message?: string
  statusCode?: number
  status?: number
  response?: {
    status?: number
    body?: unknown
  }
  cause?: unknown
}

const SUPPORT_POLICIES = `
AF Home support knowledge:
- Help customers discover furniture, appliances, home decor, and partner storefront products.
- For damaged or wrong items, ask the customer to prepare order details and photos, then contact support.
- For order tracking, direct customers to the Track Order page or their account orders page.
- Use the checkout payment method context for payment availability questions.
- Do not say a payment method is accepted unless it appears in explicit backend context.
- Do not invent prices, stock, warranty, courier, or promo details. Use only the provided backend context.
- If backend context does not contain the answer, say that support can verify it.
`

const PAYMENT_QUESTION_RE =
  /\b(payment|pay|checkout|method|card|credit|debit|bank|banking|wallet|transfer)\b/i

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const methodLabels = (methods: PaymentMethod[]) =>
  methods.flatMap((method) =>
    method.key === "online_banking" && method.providers?.length
      ? method.providers.map((provider) => provider.label)
      : [method.label]
  )

const methodAliases = (methods: PaymentMethod[]) =>
  methods.flatMap((method) => [
    method.label,
    ...(method.aliases ?? []),
    ...(method.providers ?? []).flatMap((provider) => [
      provider.label,
      ...(provider.aliases ?? []),
    ]),
  ])

const mentionsSupportedMethod = (question: string, methods: PaymentMethod[]) => {
  const normalizedQuestion = normalizeText(question)
  return methodAliases(methods).find((alias) => {
    const normalizedAlias = normalizeText(alias)
    return normalizedAlias && normalizedQuestion.includes(normalizedAlias)
  })
}

const getPaymentMethodAnswer = (question: string, methods: PaymentMethod[]) => {
  if (!PAYMENT_QUESTION_RE.test(question)) return null
  if (!methods.length) return null

  const labels = methodLabels(methods)
  const list = labels.join(", ")
  const supportedAlias = mentionsSupportedMethod(question, methods)
  const asksGenericList =
    /\b(what|which|list|available|options?)\b/i.test(question) ||
    /\bpayment methods?\b/i.test(question)
  const asksAcceptance =
    /\b(accept|accepted|allow|allowed|support|supported|can i pay|do you take|pwede|puwede)\b/i.test(
      question
    )
  const asksNamedPaymentMethod =
    /\bpayment method\b/i.test(question) && !asksGenericList
  const asksBanking = /\b(bank|banking|transfer)\b/i.test(question)

  if (supportedAlias) {
    return `Yes, we accept ${supportedAlias}. Current checkout options are: ${list}.`
  }

  if (asksAcceptance || asksNamedPaymentMethod) {
    return `No, that payment method is not listed as a supported checkout option right now. Current checkout options are: ${list}.`
  }

  if (asksBanking) {
    const bankingLabels = methods
      .filter((method) => method.key === "online_banking")
      .flatMap((method) =>
        method.providers?.length
          ? method.providers.map((provider) => provider.label)
          : [method.label]
      )
    if (bankingLabels.length) {
      return `For bank payments, the listed option is ${bankingLabels.join(", ")}. Current checkout options are: ${list}.`
    }
  }

  if (asksGenericList) return `Current checkout payment options are: ${list}.`

  return null
}

const normalizeBase = (value?: string | null) =>
  String(value ?? "").replace(/\/+$/, "")

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  ""

const getGeminiModel = () =>
  process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-2.5-flash"

const getAiErrorMessage = (error: unknown) => {
  const aiError = error as AiSupportError
  return (
    aiError?.message ||
    (aiError?.cause instanceof Error ? aiError.cause.message : "") ||
    "Unknown AI provider error"
  )
}

const getAiErrorStatus = (error: unknown) => {
  const aiError = error as AiSupportError
  return aiError?.statusCode || aiError?.status || aiError?.response?.status
}

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "1" || normalized === "true" || normalized === "yes"
  }
  return false
}

const truncate = (value: string, max = 220) => {
  const clean = value.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 3).trim()}...`
}

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")

const stripHtml = (value: string) =>
  decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const getCategoryId = (category: Category) =>
  toNumber(category.id || category.cat_id)

const getCategoryName = (category: Category) =>
  String(category.name || category.cat_name || "").trim()

const getProductCategoryId = (product: Product) =>
  toNumber(product.catid ?? product.pd_catid ?? product.category_id)

const getProductDescription = (product: Product) =>
  stripHtml(String(product.description ?? product.pd_description ?? ""))

const getProductBrand = (product: Product) =>
  String(product.brand ?? product.pd_brand ?? "").trim()

const getProductPrice = (product: Product) =>
  toNumber(product.priceMember ?? product.pd_price_member) ||
  toNumber(product.priceDp ?? product.pd_price_dp) ||
  toNumber(product.priceSrp ?? product.pd_price_srp)

const getProductStock = (product: Product) =>
  toNumber(product.qty ?? product.pd_qty)

const isBestseller = (product: Product) =>
  toBoolean(product.bestseller ?? product.pd_bestseller)

const isMustHave = (product: Product) =>
  toBoolean(product.musthave ?? product.pd_musthave)

const isSale = (product: Product) =>
  toBoolean(product.salespromo ?? product.pd_salespromo)

const formatPrice = (value: number) =>
  value > 0
    ? new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0,
      }).format(value)
    : "Price unavailable"

const productUrl = (product: Product, partnerSlug: string | null) => {
  const slug = slugify(product.name || String(product.id))
  return partnerSlug
    ? `/shop/${encodeURIComponent(partnerSlug)}/product/${slug}`
    : `/global-product/${encodeURIComponent(String(product.id))}`
}

const productImageUrl = (product: Product, apiBase: string) => {
  const image = String(product.image ?? product.pd_image ?? "").trim()
  if (!image || image === "0") return null
  if (/^(https?:)?\/\//i.test(image) || image.startsWith("data:")) {
    return image.startsWith("//") ? `https:${image}` : image
  }
  return `${apiBase}/${image.replace(/^\/+/, "")}`
}

const SHORT_PRODUCT_TERMS = new Set(["tv"])

const expandProductSearchTerm = (term: string) => {
  if (term === "tv") return ["tv", "television"]
  return [term]
}

const productSearchTerms = (question: string) =>
  normalizeText(question)
    .split(/\s+/)
    .filter(
      (term) =>
        (term.length >= 3 || SHORT_PRODUCT_TERMS.has(term)) &&
        ![
          "show",
          "list",
          "product",
          "products",
          "item",
          "items",
          "price",
          "prices",
          "available",
          "recommend",
          "recommendation",
          "suggest",
          "suggestion",
          "under",
          "below",
          "above",
          "with",
          "have",
          "meron",
          "may",
          "kayo",
          "the",
          "please",
        ].includes(term)
    )
    .flatMap(expandProductSearchTerm)

const productIntentRe =
  /\b(product|products|item|items|show|list|available|recommend|suggest|tv|television|sofa|chair|table|bed|cabinet|shelf|appliance|decor|furniture)\b/i

const supportPolicyIntentRe =
  /\b(receive|received|arrive|arrival|deliver|delivered|delivery|shipping|ship|shipped|courier|track|tracking|order|orders|days?|how long|warranty|return|refund|replacement|damaged|wrong item|payment|checkout)\b/i

const imageProductIntentRe =
  /\b(this|similar|same|product|products|item|items|have|available|find|look|match|kaparehas|kamukha|meron|may)\b/i

const requestedBudget = (question: string) => {
  const match = question.match(/(?:under|below|less than|<=?|\u20b1|php)\s*([0-9][0-9,]*)/i)
  if (!match?.[1]) return null
  const value = Number(match[1].replace(/,/g, ""))
  return Number.isFinite(value) && value > 0 ? value : null
}

const selectProductCards = (
  question: string,
  products: Product[],
  partnerSlug: string | null,
  apiBase: string
): ProductCard[] => {
  if (supportPolicyIntentRe.test(question)) return []
  if (!productIntentRe.test(question)) return []

  const terms = productSearchTerms(question)
  const budget = requestedBudget(question)
  const scored = products
    .map((product) => {
      const price = getProductPrice(product)
      const haystack = normalizeText(
        [
          product.name,
          getProductBrand(product),
          getProductDescription(product),
        ].join(" ")
      )
      const termScore = terms.reduce(
        (score, term) => score + (haystack.includes(term) ? 3 : 0),
        0
      )
      const flagScore =
        (isBestseller(product) ? 2 : 0) +
        (isMustHave(product) ? 1 : 0) +
        (isSale(product) ? 1 : 0)
      const budgetScore = budget && price > 0 && price <= budget ? 4 : 0
      const fallbackScore = terms.length ? 0 : 1

      return {
        product,
        score: termScore + flagScore + budgetScore + fallbackScore,
      }
    })
    .filter(({ product, score }) => {
      const price = getProductPrice(product)
      const haystack = normalizeText(
        [
          product.name,
          getProductBrand(product),
          getProductDescription(product),
        ].join(" ")
      )
      const hasTermMatch =
        terms.length === 0 || terms.some((term) => haystack.includes(term))
      if (budget && price > budget) return false
      if (!hasTermMatch) return false
      return score > 0
    })
    .sort((a, b) => b.score - a.score || getProductPrice(a.product) - getProductPrice(b.product))
    .slice(0, 6)

  return scored.map(({ product }) => ({
    id: product.id,
    name: product.name,
    image: productImageUrl(product, apiBase),
    price: formatPrice(getProductPrice(product)),
    description: truncate(getProductDescription(product), 120),
    url: productUrl(product, partnerSlug),
    brand: getProductBrand(product) || null,
    stock: getProductStock(product),
  }))
}

const isSpecificProductQuery = (question: string) =>
  !supportPolicyIntentRe.test(question) &&
  productIntentRe.test(question) &&
  (productSearchTerms(question).length > 0 || requestedBudget(question) !== null)

const parsePayload = async (request: Request): Promise<AiSupportPayload> => {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData()
    const message = String(form.get("message") ?? "")
    const images = form.getAll("images[]").map((value) => String(value))
    const legacyImage = String(form.get("image") ?? "").trim()
    if (legacyImage) images.push(legacyImage)
    return { message, images }
  }

  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    return {
      message: String(json.message ?? ""),
      images: Array.isArray(json.images)
        ? json.images.map((value) => String(value))
        : [],
    }
  }

  const text = await request.text().catch(() => "")
  if (!text) return { message: "", images: [] }
  if (text.trim().startsWith("{")) {
    try {
      const json = JSON.parse(text) as Record<string, unknown>
      return {
        message: String(json.message ?? ""),
        images: Array.isArray(json.images)
          ? json.images.map((value) => String(value))
          : [],
      }
    } catch {
      return { message: text, images: [] }
    }
  }
  if (!text.includes("=")) return { message: text, images: [] }

  const params = new URLSearchParams(text)
  const images = params.getAll("images[]")
  const legacyImage = params.get("image") ?? ""
  if (legacyImage) images.push(legacyImage)
  return {
    message: params.get("message") ?? "",
    images,
  }
}

const extractPartnerSlugFromRequest = (request: Request) => {
  const referer = request.headers.get("referer") ?? ""
  try {
    const url = new URL(referer)
    const path = url.pathname
    const shopMatch = path.match(/^\/shop\/([^/?#]+)/i)
    if (shopMatch?.[1]) return shopMatch[1].trim().toLowerCase()

    const directMatch = path.match(
      /^\/([^/?#]+)\/(product|category|interior-services|checkout|track-order|profile|orders|wishlist|login)(?=\/|$)/i
    )
    if (directMatch?.[1]) return directMatch[1].trim().toLowerCase()
  } catch {
    return null
  }
  return null
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const headers = {
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    }
    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function getStorefrontCategoryIds(apiBase: string, partnerSlug: string) {
  const data = await fetchJson<{ items?: WebPageItem[] }>(
    `${apiBase}/api/web-pages/partner-storefronts`
  )
  const item = (data?.items ?? []).find(
    (entry) => getPartnerStorefrontConfig(entry)?.slug === partnerSlug
  )
  return getPartnerStorefrontConfig(item)?.allowedCategoryIds ?? []
}

async function getBackendContext(apiBase: string, partnerSlug: string | null) {
  const [productsData, categoriesData] = await Promise.all([
    fetchJson<{ products?: Product[] }>(
      `${apiBase}/api/products?page=1&per_page=80&status=1`
    ),
    fetchJson<{ categories?: Category[] }>(
      `${apiBase}/api/categories?page=1&per_page=100&used_only=1`
    ),
  ])

  const products = productsData?.products ?? []
  const categories = categoriesData?.categories ?? []
  const allowedCategoryIds = partnerSlug
    ? await getStorefrontCategoryIds(apiBase, partnerSlug)
    : []
  const allowedSet = new Set(allowedCategoryIds)
  const visibleProducts =
    allowedSet.size > 0
      ? products.filter((product) => allowedSet.has(getProductCategoryId(product)))
      : products
  const visibleCategories =
    allowedSet.size > 0
      ? categories.filter((category) => allowedSet.has(getCategoryId(category)))
      : categories

  return {
    products: visibleProducts,
    categories: visibleCategories,
  }
}

async function getRagContext(
  apiBase: string,
  question: string,
  partnerSlug: string | null
): Promise<RagChunk[]> {
  if (!question.trim()) return []

  const data = await fetchJson<{ chunks?: RagChunk[] }>(
    `${apiBase}/api/ai-support/rag-search`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: question,
        partner_slug: partnerSlug,
        limit: 8,
      }),
    }
  )

  return data?.chunks ?? []
}

async function getPaymentMethods(apiBase: string): Promise<PaymentMethod[]> {
  const data = await fetchJson<{ methods?: PaymentMethod[] }>(
    `${apiBase}/api/payments/methods`
  )

  return data?.methods ?? []
}

async function getSystemSettings(apiBase: string): Promise<SystemSettings | null> {
  const data = await fetchJson<{ settings?: SystemSettings }>(
    `${apiBase}/api/settings/general`
  )

  return data?.settings ?? null
}

async function getSimilarImageProductCards(
  apiBase: string,
  images: string[]
): Promise<ProductCard[]> {
  const image = images.find((value) => value.trim() !== "")
  if (!image) return []

  const data = await fetchJson<SimilarImageResponse>(
    `${apiBase}/api/products/similar-by-image`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image,
        limit: 6,
      }),
    }
  )

  return data?.products ?? []
}

async function getImageProductKeywords(
  geminiApiKey: string,
  geminiModel: string,
  images: string[]
): Promise<string[]> {
  const image = images.find((value) => value.trim() !== "")
  if (!image) return []

  try {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey })
    const { text } = await generateText({
      model: google(geminiModel),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Identify the main sellable home product in this image. Return only a compact JSON array of 3 to 6 lowercase search terms, such as [\"bed\", \"metal bed frame\", \"black bed\"]. Do not include explanations.",
            },
            {
              type: "image",
              image,
            },
          ],
        },
      ],
    })

    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((term) => normalizeText(String(term)))
      .filter((term) => term.length >= 3)
      .slice(0, 6)
  } catch (error) {
    console.warn("[ai-support] Image keyword extraction failed:", getAiErrorMessage(error))
    return []
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const isMember = Boolean(session?.user)
  const geminiApiKey = getGeminiApiKey()
  const geminiModel = getGeminiModel()
  const apiBase =
    normalizeBase(process.env.LARAVEL_API_URL) ||
    normalizeBase(process.env.NEXT_PUBLIC_LARAVEL_API_URL)

  if (!apiBase) {
    return NextResponse.json(
      { status: "error", message: "Backend API URL is not configured." },
      { status: 500 }
    )
  }

  if (!geminiApiKey) {
    return NextResponse.json(
      { status: "error", message: "Gemini API key is not configured." },
      { status: 500 }
    )
  }

  const { message, images } = await parsePayload(request)
  const question = message.trim()
  if (!question && images.length === 0) {
    return NextResponse.json({
      status: "ok",
      reply: "Hi! How can I help you today?",
      quick_replies: [],
      step_images: [],
    })
  }

  try {
    const partnerSlug = extractPartnerSlugFromRequest(request)
    const [paymentMethods, systemSettings] = await Promise.all([
      getPaymentMethods(apiBase),
      getSystemSettings(apiBase),
    ])
    const paymentAnswer = getPaymentMethodAnswer(question, paymentMethods)
    if (paymentAnswer) {
      return NextResponse.json({
        status: "ok",
        reply: paymentAnswer,
        quick_replies: [],
        step_images: [],
      })
    }

    const [{ products, categories }, ragChunks] = await Promise.all([
      getBackendContext(apiBase, partnerSlug),
      getRagContext(apiBase, question, partnerSlug),
    ])
    const productContext = products.slice(0, 40).map((product) => ({
      id: product.id,
      name: product.name,
      description: truncate(getProductDescription(product), 140),
      categoryId: getProductCategoryId(product),
      price: getProductPrice(product),
      stock: getProductStock(product),
      brand: getProductBrand(product),
      flags: {
        bestseller: isBestseller(product),
        musthave: isMustHave(product),
        sale: isSale(product),
      },
    }))
    const categoryContext = categories.slice(0, 40).map((category) => ({
      id: getCategoryId(category),
      name: getCategoryName(category),
    }))
    const shouldSearchByImage =
      images.length > 0 &&
      !supportPolicyIntentRe.test(question) &&
      (!question || imageProductIntentRe.test(question))

    if (shouldSearchByImage) {
      const imageProductCards = await getSimilarImageProductCards(apiBase, images)
      if (imageProductCards.length > 0) {
        return NextResponse.json({
          status: "ok",
          reply:
            "Here are visually similar products from our current catalog. You can open each card to view the product details.",
          quick_replies: [],
          product_cards: imageProductCards,
          step_images: [],
        })
      }

      const imageKeywords = await getImageProductKeywords(
        geminiApiKey,
        geminiModel,
        images
      )
      const keywordProductCards = imageKeywords.length
        ? selectProductCards(
            `show ${imageKeywords.join(" ")}`,
            products,
            partnerSlug,
            apiBase
          )
        : []

      if (keywordProductCards.length > 0) {
        return NextResponse.json({
          status: "ok",
          reply:
            "I could not find an exact visual match, but these products look related to the image you sent.",
          quick_replies: [],
          product_cards: keywordProductCards,
          step_images: [],
        })
      }

      return NextResponse.json({
        status: "ok",
        reply:
          "I could not find a close visual match in the current catalog. You can try a clearer photo or add a short product name, brand, or model.",
        quick_replies: [],
        product_cards: [],
        step_images: [],
      })
    }

    const productCards = selectProductCards(question, products, partnerSlug, apiBase)
    if (productCards.length > 0) {
      return NextResponse.json({
        status: "ok",
        reply:
          "Here are matching products from our current catalog. You can open each card to view the product details.",
        quick_replies: [],
        product_cards: productCards,
        step_images: [],
      })
    }
    if (isSpecificProductQuery(question)) {
      return NextResponse.json({
        status: "ok",
        reply:
          "I could not find matching products in the current catalog. Support can verify if this item is available or coming soon.",
        quick_replies: [],
        product_cards: [],
        step_images: [],
      })
    }

    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey })

    const { text } = await generateText({
      model: google(geminiModel),
      system: `You are AF Home AI Support. Be concise, friendly, and practical.
Use only the backend context and policies provided. Do not invent prices, stock, discounts, warranties, or shipping commitments.
If the answer is not in context, say support can verify it.
The user is ${isMember ? "a signed-in member" : "a guest"}.
${partnerSlug ? `The current partner storefront slug is ${partnerSlug}. Only recommend products visible in this storefront context.` : "The user is browsing the public AF Home storefront."}
${SUPPORT_POLICIES}`,
      prompt: `Customer message:
${question || "The customer uploaded an image and needs help."}

Available categories:
${JSON.stringify(categoryContext)}

Available products:
${JSON.stringify(productContext)}

Knowledge base context:
${JSON.stringify(ragChunks)}

Checkout payment method context:
${JSON.stringify(paymentMethods)}

Current system settings:
${JSON.stringify(systemSettings)}

Image count from customer: ${images.length}

Answer in 2 to 5 short sentences. Use knowledge base context first for policy, warranty, payment, shipping, and support questions. Use product/category context only when the customer asks about products.`,
    })
    return NextResponse.json({
      status: "ok",
      reply: text,
      quick_replies: [],
      product_cards: [],
      step_images: [],
    })
  } catch (error) {
    const details = getAiErrorMessage(error)
    const providerStatus = getAiErrorStatus(error)
    console.error("[ai-support] Gemini route failed:", {
      providerStatus,
      details,
      model: geminiModel,
    })

    return NextResponse.json(
      {
        status: "error",
        message: "AI support service is unreachable right now.",
        ...(process.env.NODE_ENV === "development"
          ? {
              details,
              provider_status: providerStatus ?? null,
              model: geminiModel,
            }
          : {}),
      },
      { status: 502 }
    )
  }
}
