export interface TextMessage {
  kind: "text"
  role: "bot" | "user"
  text: string
}

export interface StepImageData {
  url: string
  caption?: string
}

export interface ProductCardData {
  id: number
  name: string
  image?: string | null
  price: string
  description?: string | null
  url: string
  brand?: string | null
  stock?: number | null
}

export interface ProductCardsMessage {
  kind: "product_cards"
  cards: ProductCardData[]
}

export interface StepImagesMessage {
  kind: "step_images"
  images: StepImageData[]
}

export interface ImageMessage {
  kind: "image"
  role: "bot" | "user"
  url: string
}

export type ChatMessage =
  | TextMessage
  | ImageMessage
  | ProductCardsMessage
  | StepImagesMessage

export interface ApiResponse {
  status: "ok" | "error"
  reply?: string
  quick_replies?: string[]
  product_cards?: ProductCardData[]
  step_images?: StepImageData[]
}
