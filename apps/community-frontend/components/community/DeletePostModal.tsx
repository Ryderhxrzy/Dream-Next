"use client"

import { useCommunityUiStore } from "@/store/community-ui.store"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useDeleteCommunityPost } from "@/lib/hooks/use-delete-community-post"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function DeletePostModal() {
  const { deletePostId, cancelDeletePost } = useCommunityUiStore()
  const deletePost = useDeleteCommunityPost()

  function handleDelete() {
    if (!deletePostId) return

    deletePost.mutate(deletePostId, {
      onSuccess: () => {
        cancelDeletePost()
        toast.success("Post deleted.")
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete post.")
      },
    })
  }

  return (
    <Dialog
      open={!!deletePostId}
      onOpenChange={(open) => !open && cancelDeletePost()}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base font-semibold">
            Delete post?
          </DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          This will permanently remove your post from the community. This action
          cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            className="text-foreground/80 h-9 text-sm"
            onClick={cancelDeletePost}
            disabled={deletePost.isPending}
          >
            Cancel
          </Button>
          <Button
            className="h-9 min-w-[90px] bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
            onClick={handleDelete}
            disabled={deletePost.isPending}
          >
            {deletePost.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
