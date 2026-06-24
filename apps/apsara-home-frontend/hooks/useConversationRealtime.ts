"use client"

import { useEffect } from "react"
import {
  adminConversationsApi,
  type ConversationMessage,
} from "@/store/api/adminConversationsApi"
import { useAppDispatch } from "@/store/hooks"
import Pusher from "pusher-js"

interface Options {
  conversationId: number | null | undefined
  accessToken: string | null | undefined
}

/**
 * Subscribes to `private-conversation-{id}` and merges incoming `message.sent`
 * events into the getAdminConversation cache (deduped by message id). Powers the
 * realtime admin↔customer chat thread.
 */
export function useConversationRealtime({ conversationId, accessToken }: Options) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (typeof window === "undefined") return

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "").replace(
      /\/+$/,
      ""
    )

    if (!pusherKey || !pusherCluster || !apiBaseUrl || !accessToken || !conversationId)
      return

    const channelName = `private-conversation-${conversationId}`

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      channelAuthorization: {
        endpoint: `${apiBaseUrl}/api/admin/conversations/pusher/auth`,
        transport: "ajax",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    })

    const channel = pusher.subscribe(channelName)

    const onMessage = (data: Partial<ConversationMessage> & { id?: number }) => {
      if (!data?.id) return
      const message: ConversationMessage = {
        id: Number(data.id),
        conversation_id: Number(data.conversation_id ?? conversationId),
        sender_id: Number(data.sender_id ?? 0),
        message: String(data.message ?? ""),
        is_internal: Boolean(data.is_internal),
        attachment_url: data.attachment_url ?? null,
        attachment_filename: data.attachment_filename ?? null,
        is_read: Boolean(data.is_read),
        read_at: data.read_at ?? null,
        created_at: String(data.created_at ?? new Date().toISOString()),
      }

      dispatch(
        adminConversationsApi.util.updateQueryData(
          "getAdminConversation",
          conversationId,
          (draft) => {
            if (!draft?.data) return
            if (!draft.data.messages) draft.data.messages = []
            if (draft.data.messages.some((m) => m.id === message.id)) return
            draft.data.messages.push(message)
            draft.data.message_count = (draft.data.message_count ?? 0) + 1
            draft.data.last_message = {
              message: message.message,
              sent_at: message.created_at,
              sender_id: message.sender_id,
              is_internal: message.is_internal,
            }
          }
        )
      )
    }

    channel.bind("message.sent", onMessage)

    return () => {
      channel.unbind("message.sent", onMessage)
      pusher.unsubscribe(channelName)
      pusher.disconnect()
    }
  }, [conversationId, accessToken, dispatch])
}
