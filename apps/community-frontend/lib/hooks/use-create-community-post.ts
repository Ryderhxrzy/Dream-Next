import { useAuthStore } from "@/store/auth.store"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

type CreatePostInput = {
  category: string
  title: string
  content: string
  image?: File | null
  eventDate?: Date | null
  eventTime?: string | null
  eventEndTime?: string | null
  location?: string | null
  price?: string | null
  condition?: string | null
}

type UploadImageResponse = {
  imageUrl: string
  publicId: string
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      let imageUrl: string | null = null

      if (input.image) {
        const formData = new FormData()
        formData.append("image", input.image)

        const upload = await api<UploadImageResponse>("/posts/images", {
          method: "POST",
          token,
          body: formData,
        })

        imageUrl = upload.imageUrl
      }

      return api("/posts", {
        method: "POST",
        token,
        body: JSON.stringify({
          category: input.category,
          title: input.title,
          content: input.content,
          imageUrl,
          eventDate: input.eventDate,
          eventTime: input.eventTime,
          eventEndTime: input.eventEndTime,
          location: input.location,
          price: input.price,
          condition: input.condition,
        }),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community-posts"] })
    },
  })
}
