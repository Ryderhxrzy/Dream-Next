"use client"

import { useEffect, useState } from "react"
import { useCommunityUiStore } from "@/store/community-ui.store"
import { Loader2, Repeat2 } from "lucide-react"
import { toast } from "sonner"

import { useRepost } from "@/lib/hooks/use-repost"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function RepostModal() {
  const { repostPost, closeRepost } = useCommunityUiStore()
  const [caption, setCaption] = useState("")
  const repost = useRepost()

  const open = !!repostPost

  useEffect(() => {
    if (!open) setCaption("")
  }, [open])

  // If reposting a repost, embed the true original
  const original = repostPost?.repostOf ?? repostPost

  function handleSubmit() {
    if (!repostPost) return
    repost.mutate(
      { postId: repostPost.id, caption: caption.trim() },
      {
        onSuccess: () => {
          toast.success("Reposted to your feed!")
          closeRepost()
        },
        onError: (e) => toast.error(e.message ?? "Failed to repost"),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeRepost()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base font-semibold">
            <Repeat2 className="h-4 w-4" />
            Repost
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Caption */}
          <Textarea
            placeholder="Add a caption... (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="bg-muted border-border min-h-20 resize-none text-sm"
          />

          {/* Embedded original preview */}
          {original && (
            <div className="border-border space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={original.author.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                    {original.author.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground text-sm font-semibold">
                  {original.author.name}
                </span>
              </div>
              {original.title && (
                <p className="text-foreground text-sm font-medium">
                  {original.title}
                </p>
              )}
              <p className="text-foreground/80 line-clamp-3 text-sm">
                {original.content}
              </p>
              {original.imageUrl && (
                <div className="bg-muted aspect-video overflow-hidden rounded-md">
                  <img
                    src={original.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={closeRepost}
              className="text-foreground/80 h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={repost.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-5 text-sm font-medium"
            >
              {repost.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reposting...
                </span>
              ) : (
                "Repost"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
