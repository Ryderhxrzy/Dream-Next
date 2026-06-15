import { Skeleton } from "@/components/ui/skeleton"

export function PostCardSkeleton() {
  return (
    <div className="bg-card border-border space-y-3 rounded-xl border p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>

      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-[75%]" />
      </div>

      {/* Image placeholder */}
      <Skeleton className="aspect-video w-full rounded-lg" />

      {/* Actions */}
      <div className="border-border flex items-center gap-4 border-t pt-1">
        <Skeleton className="mt-2 h-4 w-16" />
        <Skeleton className="mt-2 h-4 w-20" />
        <Skeleton className="mt-2 h-4 w-14" />
      </div>
    </div>
  )
}

export function PostFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}
