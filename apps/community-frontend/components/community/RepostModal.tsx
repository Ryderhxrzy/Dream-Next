"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, Repeat2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useRepost } from "@/lib/hooks/use-repost"
import { useCommunityUiStore } from "@/store/community-ui.store"

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
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeRepost()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Repeat2 className="w-4 h-4" />
            Repost
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Caption */}
          <Textarea
            placeholder="Add a caption... (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="bg-muted border-border text-sm resize-none min-h-20"
          />

          {/* Embedded original preview */}
          {original && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={original.author.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                    {original.author.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-foreground">{original.author.name}</span>
              </div>
              {original.title && (
                <p className="text-sm font-medium text-foreground">{original.title}</p>
              )}
              <p className="text-sm text-foreground/80 line-clamp-3">{original.content}</p>
              {original.imageUrl && (
                <div className="rounded-md overflow-hidden bg-muted aspect-video">
                  <img src={original.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={closeRepost} className="h-9 text-sm text-foreground/80">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={repost.isPending}
              className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium"
            >
              {repost.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
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
