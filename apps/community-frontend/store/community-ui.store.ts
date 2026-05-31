import { create } from "zustand";

import type { CommunityPost } from "@/lib/hooks/use-community-posts";

type CommunityUiState = {
  // Create post modal
  createPostOpen: boolean;
  openCreatePost: () => void;
  closeCreatePost: () => void;

  // Edit post modal
  editPost: CommunityPost | null;
  openEditPost: (post: CommunityPost) => void;
  closeEditPost: () => void;

  // Delete confirm modal
  deletePostId: string | null;
  confirmDeletePost: (postId: string) => void;
  cancelDeletePost: () => void;

  // Comments modal
  commentsPost: { id: string; title: string } | null;
  openComments: (post: { id: string; title: string }) => void;
  closeComments: () => void;
};

export const useCommunityUiStore = create<CommunityUiState>((set) => ({
  createPostOpen: false,
  openCreatePost: () => set({ createPostOpen: true }),
  closeCreatePost: () => set({ createPostOpen: false }),

  editPost: null,
  openEditPost: (post) => set({ editPost: post }),
  closeEditPost: () => set({ editPost: null }),

  deletePostId: null,
  confirmDeletePost: (postId) => set({ deletePostId: postId }),
  cancelDeletePost: () => set({ deletePostId: null }),

  commentsPost: null,
  openComments: (post) => set({ commentsPost: post }),
  closeComments: () => set({ commentsPost: null }),
}));
