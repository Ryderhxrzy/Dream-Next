import ProductPageWrapper from "@/components/product/ProductPageWrapper"
import SkeletonBox from "@/components/ui/SkeletonBox"

// Instant page shell on navigation: the real navbar renders immediately and the
// product area shows a skeleton (Lazada-style) while the server fetches data —
// no blank white screen, no full-screen splash.
export default function Loading() {
  return (
    <ProductPageWrapper initialCategories={[]}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <SkeletonBox className="mb-6 h-4 w-64" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <SkeletonBox className="aspect-square w-full" />
            <div className="mt-4 flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox key={i} className="h-20 w-20" />
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <SkeletonBox className="h-8 w-3/4" />
            <SkeletonBox className="h-5 w-1/3" />
            <SkeletonBox className="h-10 w-40" />
            <SkeletonBox className="h-px w-full" />
            <SkeletonBox className="h-24 w-full" />
            <div className="flex gap-3">
              <SkeletonBox className="h-12 w-40" />
              <SkeletonBox className="h-12 w-40" />
            </div>
          </div>
        </div>

        {/* Tabs / description */}
        <div className="mt-10 flex flex-col gap-3">
          <SkeletonBox className="h-6 w-48" />
          <SkeletonBox className="h-4 w-full" />
          <SkeletonBox className="h-4 w-5/6" />
          <SkeletonBox className="h-4 w-2/3" />
        </div>
      </div>
    </ProductPageWrapper>
  )
}
