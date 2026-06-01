import { create } from "zustand";

type ChatUiState = {
  // The conversation currently open on screen (null if not viewing any)
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
};

export const useChatUiStore = create<ChatUiState>((set) => ({
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),
}));
