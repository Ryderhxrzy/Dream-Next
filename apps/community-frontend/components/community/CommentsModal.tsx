"use client";

import { useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { CornerDownRight, Loader2, Send } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  usePostComments,
  useCreateComment,
  useCreateReply,
  type CommentAuthor,
  type CommentReply,
} from "@/lib/hooks/use-post-comments";
import { useCommunityUiStore } from "@/store/community-ui.store";

function AuthorAvatar({ author }: { author: CommentAuthor }) {
  return (
    <Avatar className="w-8 h-8 shrink-0">
      <AvatarImage src={author.avatarUrl ?? ""} />
      <AvatarFallback className="bg-muted text-foreground/90 text-xs font-semibold">
        {author.name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function ReplyItem({ reply }: { reply: CommentReply }) {
  return (
    <div className="flex gap-2">
      <AuthorAvatar author={reply.author} />
      <div className="flex-1 min-w-0">
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <p className="text-xs font-semibold text-foreground mb-0.5">{reply.author.name}</p>
          <p className="text-sm text-foreground/90 leading-relaxed">{reply.content}</p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 px-1">
          {formatDistanceToNowStrict(new Date(reply.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function ReplyInput({
  postId,
  commentId,
  onCancel,
}: {
  postId: string;
  commentId: string;
  onCancel: () => void;
}) {
  const createReply = useCreateReply(postId, commentId);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || createReply.isPending) return;

    createReply.mutate(trimmed, {
      onSuccess: () => {
        setText("");
        onCancel();
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-2 ml-10">
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        placeholder="Write a reply..."
        className="flex-1 h-8 px-3 text-xs bg-card border border-border rounded-full outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground/80 shrink-0"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={!text.trim() || createReply.isPending}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        {createReply.isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Send className="w-3.5 h-3.5" />
        }
      </button>
    </form>
  );
}

export function CommentsModal() {
  const { commentsPost, closeComments } = useCommunityUiStore();
  const postId = commentsPost?.id ?? "";

  const commentsQuery = usePostComments(postId, !!commentsPost);
  const createComment = useCreateComment(postId);

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || createComment.isPending) return;

    createComment.mutate(trimmed, {
      onSuccess: () => setCommentText(""),
    });
  }

  return (
    <Dialog open={!!commentsPost} onOpenChange={(open) => !open && closeComments()}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground truncate pr-6">
            {commentsPost?.title ?? "Comments"}
          </DialogTitle>
        </DialogHeader>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto space-y-4 py-1 min-h-0">
          {commentsQuery.isPending || commentsQuery.isFetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : commentsQuery.isError ? (
            <p className="text-sm text-red-500 text-center py-8">
              {commentsQuery.error?.message ?? "Failed to load comments."}
            </p>
          ) : !commentsQuery.data || commentsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Be the first!
            </p>
          ) : (
            commentsQuery.data.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Comment */}
                <div className="flex gap-2.5">
                  <AuthorAvatar author={comment.author} />
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted border border-border rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-foreground mb-0.5">
                        {comment.author.name}
                      </p>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="ml-10 space-y-2 border-l-2 border-border pl-3">
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
        <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center pt-2 border-t border-border">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 h-9 px-3 text-sm bg-muted border border-border rounded-full outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || createComment.isPending}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {createComment.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
