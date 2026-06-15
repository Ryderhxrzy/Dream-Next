"use client"

import { useRef, useState } from "react"
import { useCommunityUiStore } from "@/store/community-ui.store"
import { formatDistanceToNowStrict } from "date-fns"
import { CornerDownRight, Loader2, Send } from "lucide-react"

import {
  useCreateComment,
  useCreateReply,
  usePostComments,
  type CommentAuthor,
  type CommentReply,
} from "@/lib/hooks/use-post-comments"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function AuthorAvatar({ author }: { author: CommentAuthor }) {
  return (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={author.avatarUrl ?? ""} />
      <AvatarFallback className="bg-muted text-foreground/90 text-xs font-semibold">
        {author.name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

function ReplyItem({ reply }: { reply: CommentReply }) {
  return (
    <div className="flex gap-2">
      <AuthorAvatar author={reply.author} />
      <div className="min-w-0 flex-1">
        <div className="bg-card border-border rounded-xl border px-3 py-2">
          <p className="text-foreground mb-0.5 text-xs font-semibold">
            {reply.author.name}
          </p>
          <p className="text-foreground/90 text-sm leading-relaxed">
            {reply.content}
          </p>
        </div>
        <p className="text-muted-foreground mt-1 px-1 text-[11px]">
          {formatDistanceToNowStrict(new Date(reply.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  )
}

function ReplyInput({
  postId,
  commentId,
  onCancel,
}: {
  postId: string
  commentId: string
  onCancel: () => void
}) {
  const createReply = useCreateReply(postId, commentId)
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || createReply.isPending) return

    createReply.mutate(trimmed, {
      onSuccess: () => {
        setText("")
        onCancel()
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 ml-10 flex items-center gap-2"
    >
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        placeholder="Write a reply..."
        className="bg-card border-border focus:border-ring placeholder:text-muted-foreground h-8 flex-1 rounded-full border px-3 text-xs transition-colors outline-none"
      />
      <button
        type="button"
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground/80 shrink-0 text-xs"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={!text.trim() || createReply.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        {createReply.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
      </button>
    </form>
  )
}

export function CommentsModal() {
  const { commentsPost, closeComments } = useCommunityUiStore()
  const postId = commentsPost?.id ?? ""

  const commentsQuery = usePostComments(postId, !!commentsPost)
  const createComment = useCreateComment(postId)

  const [commentText, setCommentText] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = commentText.trim()
    if (!trimmed || createComment.isPending) return

    createComment.mutate(trimmed, {
      onSuccess: () => setCommentText(""),
    })
  }

  return (
    <Dialog
      open={!!commentsPost}
      onOpenChange={(open) => !open && closeComments()}
    >
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground truncate pr-6 text-base font-semibold">
            {commentsPost?.title ?? "Comments"}
          </DialogTitle>
        </DialogHeader>

        {/* Comment list */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1">
          {commentsQuery.isPending || commentsQuery.isFetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : commentsQuery.isError ? (
            <p className="py-8 text-center text-sm text-red-500">
              {commentsQuery.error?.message ?? "Failed to load comments."}
            </p>
          ) : !commentsQuery.data || commentsQuery.data.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No comments yet. Be the first!
            </p>
          ) : (
            commentsQuery.data.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Comment */}
                <div className="flex gap-2.5">
                  <AuthorAvatar author={comment.author} />
                  <div className="min-w-0 flex-1">
                    <div className="bg-muted border-border rounded-xl border px-3 py-2">
                      <p className="text-foreground mb-0.5 text-xs font-semibold">
                        {comment.author.name}
                      </p>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-3 px-1">
                      <p className="text-muted-foreground text-[11px]">
                        {formatDistanceToNowStrict(
                          new Date(comment.createdAt),
                          { addSuffix: true }
                        )}
                      </p>
                      <button
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id
                          )
                        }
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-medium transition-colors"
                      >
                        <CornerDownRight className="h-3 w-3" />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="border-border ml-10 space-y-2 border-l-2 pl-3">
                    {comment.replies.map((reply) => (
                      <ReplyItem key={reply.id} reply={reply} />
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === comment.id && (
                  <ReplyInput
                    postId={postId}
                    commentId={comment.id}
                    onCancel={() => setReplyingTo(null)}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Main comment input */}
        <form
          onSubmit={handleCommentSubmit}
          className="border-border flex items-center gap-2 border-t pt-2"
        >
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="bg-muted border-border focus:border-ring placeholder:text-muted-foreground h-9 flex-1 rounded-full border px-3 text-sm transition-colors outline-none"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || createComment.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
