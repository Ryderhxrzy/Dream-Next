import { create } from "zustand";

import type { CommunityPost } from "@/lib/hooks/use-community-posts";

type CommunityUiState = {
  // Create post modal
  createPostOpen: boolean;
  createPostCategory: string | null;
  openCreatePost: (category?: string) => void;
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

  // Event respondents modal
  respondentsEvent: { id: string; title: string; isOwner: boolean } | null;
  openRespondents: (event: { id: string; title: string; isOwner: boolean }) => void;
  closeRespondents: () => void;

  // Repost modal
  repostPost: CommunityPost | null;
  openRepost: (post: CommunityPost) => void;
  closeRepost: () => void;
};

export const useCommunityUiStore = create<CommunityUiState>((set) => ({
  createPostOpen: false,
  createPostCategory: null,
  openCreatePost: (category) => set({ createPostOpen: true, createPostCategory: category ?? null }),
  closeCreatePost: () => set({ createPostOpen: false, createPostCategory: null }),

  editPost: null,
  openEditPost: (post) => set({ editPost: post }),
  closeEditPost: () => set({ editPost: null }),

  deletePostId: null,
  confirmDeletePost: (postId) => set({ deletePostId: postId }),
  cancelDeletePost: () => set({ deletePostId: null }),

  commentsPost: null,
  openComments: (post) => set({ commentsPost: post }),
  closeComments: () => set({ commentsPost: null }),

  respondentsEvent: null,
  openRespondents: (event) => set({ respondentsEvent: event }),
  closeRespondents: () => set({ respondentsEvent: null }),

  repostPost: null,
  openRepost: (post) => set({ repostPost: post }),
  closeRepost: () => set({ repostPost: null }),
}));
