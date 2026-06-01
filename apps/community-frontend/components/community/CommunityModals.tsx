"use client"

import { Plus } from "lucide-react"
import { CreatePostModal } from "@/components/community/CreatePostModal"
import { CommentsModal } from "@/components/community/CommentsModal"
import { DeletePostModal } from "@/components/community/DeletePostModal"
import { RespondentsModal } from "@/components/community/RespondentsModal"
import { RepostModal } from "@/components/community/RepostModal"
import { useCommunityUiStore } from "@/store/community-ui.store"

export function CommunityModals() {
  const { createPostOpen, openCreatePost, closeCreatePost, editPost, closeEditPost } =
    useCommunityUiStore()

  return (
    <>
      {/* Modals — always mounted so they work on every screen size */}
      <CreatePostModal open={createPostOpen} onClose={closeCreatePost} />
      <CreatePostModal open={!!editPost} onClose={closeEditPost} editPost={editPost ?? undefined} />
      <DeletePostModal />
      <CommentsModal />
      <RespondentsModal />
      <RepostModal />

      {/* Mobile floating "Post" button — hidden on desktop (RightPanel has its own) */}
      <button
        onClick={openCreatePost}
        className="xl:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label="Post to community"
      >
        <Plus className="w-6 h-6" />
      </button>
    </>
  )
}
