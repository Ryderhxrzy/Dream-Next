"use client"

import { useEffect } from "react"
import {
  customerConversationsApi,
  type ConversationMessage,
} from "@/store/api/customerConversationsApi"
import { useAppDispatch } from "@/store/hooks"
import Pusher from "pusher-js"

interface Options {
  conversationId: number | null | undefined
  accessToken: string | null | undefined
}

/**
 * Customer-side realtime: subscribes to `private-conversation-{id}` (authenticated
 * via the customer pusher-auth endpoint) and merges incoming `message.sent` events
 * into the getCustomerMessages cache, deduped by id.
 */
export function useCustomerConversationRealtime({
  conversationId,
  accessToken,
}: Options) {
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
        endpoint: `${apiBaseUrl}/api/conversations/pusher/auth`,
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
        // Backend now includes sender_type in the broadcast; default to "admin"
        // since a customer's own message is deduped via the send mutation's cache.
        sender_type: data.sender_type ?? "admin",
        message: String(data.message ?? ""),
        is_internal: Boolean(data.is_internal),
        attachment_url: data.attachment_url ?? null,
        attachment_filename: data.attachment_filename ?? null,
        is_read: Boolean(data.is_read),
        read_at: data.read_at ?? null,
        created_at: String(data.created_at ?? new Date().toISOString()),
      }
      // Internal admin notes must never reach the customer.
      if (message.is_internal) return

      dispatch(
        customerConversationsApi.util.updateQueryData(
          "getCustomerMessages",
          conversationId,
          (draft) => {
            if (!draft?.data) return
            if (draft.data.some((m) => m.id === message.id)) return
            draft.data.push(message)
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
