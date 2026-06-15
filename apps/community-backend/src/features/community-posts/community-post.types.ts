import type {
  CommunityItemCondition,
  CommunityPostCategory,
} from "../../generated/prisma/enums.js"

export type CreateCommunityPostInput = {
  category: CommunityPostCategory
  title: string
  content: string
  imageUrl: string | null
  eventDate: Date | null
  eventTime: string | null
  eventEndTime: string | null
  location: string | null
  latitude: string | null
  longitude: string | null
  price: string | null
  condition: CommunityItemCondition | null
}

export type CommunityPostImageUpload = {
  publicId: string
  secureUrl: string
  width: number | null
  height: number | null
  format: string | null
}
