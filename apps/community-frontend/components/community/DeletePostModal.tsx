"use client";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteCommunityPost } from "@/lib/hooks/use-delete-community-post";
import { useCommunityUiStore } from "@/store/community-ui.store";

export function DeletePostModal() {
  const { deletePostId, cancelDeletePost } = useCommunityUiStore();
  const deletePost = useDeleteCommunityPost();

  function handleDelete() {
    if (!deletePostId) return;

    deletePost.mutate(deletePostId, {
      onSuccess: () => {
        cancelDeletePost();
        toast.success("Post deleted.");
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete post.");
      },
    });
  }

  return (
    <Dialog open={!!deletePostId} onOpenChange={(open) => !open && cancelDeletePost()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-zinc-900">
            Delete post?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-zinc-500">
          This will permanently remove your post from the community. This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            className="h-9 text-sm text-zinc-600"
            onClick={cancelDeletePost}
            disabled={deletePost.isPending}
          >
            Cancel
          </Button>
          <Button
            className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium min-w-[90px]"
            onClick={handleDelete}
            disabled={deletePost.isPending}
          >
            {deletePost.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
