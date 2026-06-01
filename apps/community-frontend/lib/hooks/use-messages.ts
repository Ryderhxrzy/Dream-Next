import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export type ChatUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type Conversation = {
  id: string;
  otherUser: ChatUser | null;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  content: string;
  imageUrl?: string | null;
  senderId: string;
  sender: ChatUser;
  createdAt: string;
};

export type MessagesData = {
  messages: ChatMessage[];
  otherReadAt: string | null;
};

export function useConversations() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<Conversation[]>("/messages/conversations", { token }),
    enabled: !!token,
  });
}

// Total unread messages across all conversations (for nav badge)
export function useUnreadMessageCount() {
  const { data } = useConversations();
  return data?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
}

export function useMessages(conversationId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api<MessagesData>(`/messages/conversations/${conversationId}/messages`, { token }),
    enabled: !!conversationId,
  });
}

type UploadResponse = { imageUrl: string; publicId: string };

export function useSendMessage(conversationId: string) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, image }: { content: string; image?: File | null }) => {
      let imageUrl: string | null = null;

      if (image) {
        const formData = new FormData();
        formData.append("image", image);
        const upload = await api<UploadResponse>("/messages/images", {
          method: "POST",
          token,
          body: formData,
        });
        imageUrl = upload.imageUrl;
      }

      return api<ChatMessage>(`/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({ content, imageUrl }),
      });
    },
    onSuccess: (msg) => {
      queryClient.setQueryData<MessagesData>(["messages", conversationId], (old) => {
        if (!old) return { messages: [msg], otherReadAt: null };
        // Dedupe — the socket may have already added this message
        if (old.messages.some((m) => m.id === msg.id)) return old;
        return { ...old, messages: [...old.messages, msg] };
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useStartConversation() {
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: (userId: string) =>
      api<{ conversationId: string }>("/messages/conversations", {
        method: "POST",
        token,
        body: JSON.stringify({ userId }),
      }),
  });
}

export function useMarkConversationRead() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      api(`/messages/conversations/${conversationId}/read`, { method: "POST", token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
