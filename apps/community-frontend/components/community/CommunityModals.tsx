"use client"

import { useCommunityUiStore } from "@/store/community-ui.store"
import { Plus } from "lucide-react"

import { CommentsModal } from "@/components/community/CommentsModal"
import { CreatePostModal } from "@/components/community/CreatePostModal"
import { DeletePostModal } from "@/components/community/DeletePostModal"
import { RepostModal } from "@/components/community/RepostModal"
import { RespondentsModal } from "@/components/community/RespondentsModal"

export function CommunityModals() {
  const {
    createPostOpen,
    createPostCategory,
    openCreatePost,
    closeCreatePost,
    editPost,
    closeEditPost,
  } = useCommunityUiStore()

  return (
    <>
      {/* Modals — always mounted so they work on every screen size */}
      <CreatePostModal
        open={createPostOpen}
        onClose={closeCreatePost}
        presetCategory={createPostCategory ?? undefined}
      />
      <CreatePostModal
        open={!!editPost}
        onClose={closeEditPost}
        editPost={editPost ?? undefined}
      />
      <DeletePostModal />
      <CommentsModal />
      <RespondentsModal />
      <RepostModal />

      {/* Mobile floating "Post" button — hidden on desktop (RightPanel has its own) */}
      <button
        onClick={() => openCreatePost()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors xl:hidden"
        aria-label="Post to community"
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  )
}
