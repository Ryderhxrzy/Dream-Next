import { Skeleton } from "@/components/ui/skeleton"

export function PostCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
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
      <Skeleton className="w-full aspect-video rounded-lg" />

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1 border-t border-border">
        <Skeleton className="h-4 w-16 mt-2" />
        <Skeleton className="h-4 w-20 mt-2" />
        <Skeleton className="h-4 w-14 mt-2" />
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
