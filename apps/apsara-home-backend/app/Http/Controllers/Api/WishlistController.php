<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Events\WishlistAdded;
use App\Services\QueryOptimizerService;
use App\Services\CacheService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Wishlist;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search'   => ['nullable', 'string', 'max:255'],
            'q'        => ['nullable', 'string', 'max:255'],
            'page'     => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        // Prefer `search`, but fall back to `q` when `search` is missing OR sent empty
        // (`??` alone would let an empty `search` string shadow a valid `q`).
        $search = trim((string) ($validated['search'] ?? ''));
        if ($search === '') {
            $search = trim((string) ($validated['q'] ?? ''));
        }
        $perPage = (int) ($validated['per_page'] ?? 12);
        // Pagination is opt-in: callers that pass neither page nor per_page keep
        // receiving the full list (backward compatible with existing wishlist views).
        $shouldPaginate = $request->filled('page') || $request->filled('per_page');

        $baseQuery = Wishlist::query()
            ->with(['product' => function ($query) {
                $query->select([
                    'pd_id', 'pd_name', 'pd_description', 'pd_specifications', 'pd_material', 'pd_warranty',
                    'pd_catid', 'pd_catsubid', 'pd_room_type', 'pd_brand_type', 'pd_supplier',
                    'pd_price_srp', 'pd_price_dp', 'pd_price_member', 'pd_qty',
                    'pd_prodpv',
                    'pd_weight', 'pd_psweight', 'pd_pswidth', 'pd_pslenght', 'pd_psheight',
                    'pd_assembly_required', 'pd_type', 'pd_musthave',
                    'pd_bestseller', 'pd_salespromo', 'pd_status', 'pd_date',
                    'pd_last_update', 'pd_parent_sku', 'pd_image',
                ])
                ->with([
                    'photos:pp_id,pp_pdid,pp_filename,pp_varone,pp_date',
                    'brand:pb_id,pb_name,pb_status',
                    'variants:pv_id,pv_pdid,pv_sku,pv_name,pv_color,pv_color_hex,pv_size,pv_style,pv_width,pv_dimension,pv_height,pv_price_srp,pv_price_dp,pv_price_member,pv_prodpv,pv_qty,pv_status,pv_date',
                    'variants.photos:pvp_id,pvp_pvid,pvp_filename,pvp_sort,pvp_date',
                ])
                ->whereIn('pd_status', [1, 2]); // Apply public visibility
            }])
            ->where('cw_customer_id', Auth::id())
            // Only keep wishlist rows whose product is public-visible and matches the search.
            ->whereHas('product', function ($query) use ($search) {
                $query->whereIn('pd_status', [1, 2]);

                if ($search !== '') {
                    // Escape LIKE wildcards so %/_ in the term match literally, and use
                    // ilike for case-insensitive matching on PostgreSQL (parity with the
                    // main product search in ProductController::applyKeywordSearch()).
                    $like = '%' . addcslashes($search, '\\%_') . '%';
                    $query->where(function ($inner) use ($like) {
                        $inner->where('pd_name', 'ilike', $like)
                            ->orWhere('pd_parent_sku', 'ilike', $like)
                            ->orWhereHas('variants', function ($variantQuery) use ($like) {
                                $variantQuery->where('pv_sku', 'ilike', $like);
                            });
                    });
                }
            })
            ->orderByDesc('cw_id');

        if ($shouldPaginate) {
            $paginator = $baseQuery->paginate($perPage);
            $wishlistItems = collect($paginator->items());
            $meta = [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ];
        } else {
            $wishlistItems = $baseQuery->get();
            $count = $wishlistItems->count();
            $meta = [
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $count,
                'total'        => $count,
                'from'         => $count > 0 ? 1 : null,
                'to'           => $count > 0 ? $count : null,
            ];
        }

        $wishlistItems = $wishlistItems->filter(function ($wishlistItem) {
            return $wishlistItem->product !== null;
        });

        // Pre-load sold counts for all products in single query (N+1 fix)
        $productIds = $wishlistItems->pluck('product.pd_id')->filter()->unique();
        $soldCounts = [];
        $avgRatings = [];
        
        if ($productIds->isNotEmpty()) {
            // Single query for all sold counts
            $soldCountsData = DB::table('tbl_checkout_history')
                ->whereIn('ch_product_id', $productIds)
                ->whereIn('ch_status', ['paid', 'completed', 'shipped'])
                ->selectRaw('ch_product_id, SUM(ch_quantity) as total_sold')
                ->groupBy('ch_product_id')
                ->pluck('total_sold', 'ch_product_id');
            
            $soldCounts = $soldCountsData->toArray();
            
            // Single query for all average ratings
            $ratingsData = DB::table('tbl_product_reviews')
                ->whereIn('pr_product_id', $productIds)
                ->selectRaw('pr_product_id, AVG(pr_rating) as avg_rating')
                ->groupBy('pr_product_id')
                ->pluck('avg_rating', 'pr_product_id');
            
            $avgRatings = $ratingsData->map(fn($rating) => (float) $rating)->toArray();
        }

        return response()->json([
            'data' => $wishlistItems->values()->map(function ($wishlistItem) use ($soldCounts, $avgRatings) {
                $product = $wishlistItem->product;
                
                // Use pre-loaded data instead of individual queries
                $soldCount = $soldCounts[$product->pd_id] ?? 0;
                $avgRating = $avgRatings[$product->pd_id] ?? 0.0;
                
                $mappedProduct = $this->mapProduct($product, $soldCount, $avgRating);
                
                return [
                    'wishlist_id' => (int) $wishlistItem->cw_id,
                    'customer_id' => (int) $wishlistItem->cw_customer_id,
                    'product_id' => (int) $wishlistItem->cw_product_id,
                    'date_added' => $wishlistItem->cw_date ? (is_string($wishlistItem->cw_date) ? $wishlistItem->cw_date : $wishlistItem->cw_date->format('Y-m-d H:i:s')) : null,
                    'product' => $mappedProduct,
                ];
            }),
            'meta' => array_merge($meta, [
                'search' => $search !== '' ? $search : null,
            ]),
        ]);
    }

    /**
     * Product recommendations seeded from the authenticated customer's wishlist.
     *
     * Strategy (Phase 1 - category affinity):
     *   1. Collect the categories of the customer's currently wishlisted (visible) products.
     *   2. Return active products from those same categories, excluding items already
     *      wishlisted, ranked by bestseller / must-have / recency.
     *   3. Cold-start / padding: top up remaining slots with popular products so the
     *      feed is always full (works for users with an empty wishlist too).
     *
     * Returns the same product DTO as the wishlist list endpoint so the client can
     * reuse its existing product-card rendering.
     */
    public function recommendations(Request $request)
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $limit = (int) ($validated['limit'] ?? 12);
        $userId = Auth::id();

        // 1. Pull the customer's wishlist rows with just the product id + category.
        $wishlistRows = Wishlist::query()
            ->where('cw_customer_id', $userId)
            ->whereHas('product', function ($query) {
                $query->whereIn('pd_status', [1, 2]); // public visibility
            })
            ->with(['product' => function ($query) {
                $query->select('pd_id', 'pd_catid');
            }])
            ->get();

        $wishlistedProductIds = $wishlistRows
            ->pluck('cw_product_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $categoryIds = $wishlistRows
            ->pluck('product.pd_catid')
            ->filter(fn ($id) => (int) $id > 0)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        // 2. Wishlist-seeded picks: products from the same categories, never re-suggesting
        //    something already on the wishlist.
        $products = collect();
        if (!empty($categoryIds)) {
            $products = $this->baseRecommendationQuery()
                ->whereIn('pd_catid', $categoryIds)
                ->when(!empty($wishlistedProductIds), fn ($q) => $q->whereNotIn('pd_id', $wishlistedProductIds))
                ->orderByDesc('pd_bestseller')
                ->orderByDesc('pd_musthave')
                ->orderByDesc('pd_date')
                ->limit($limit)
                ->get();
        }

        $source = $products->isNotEmpty() ? 'wishlist' : 'popular';

        // 3. Cold-start / padding with popular products when the wishlist is empty or thin.
        if ($products->count() < $limit) {
            $needed = $limit - $products->count();
            $alreadyPicked = $products->pluck('pd_id')->map(fn ($id) => (int) $id)->all();
            $excludeIds = array_values(array_unique(array_merge($wishlistedProductIds, $alreadyPicked)));

            $popular = $this->baseRecommendationQuery()
                ->when(!empty($excludeIds), fn ($q) => $q->whereNotIn('pd_id', $excludeIds))
                ->orderByDesc('pd_bestseller')
                ->orderByDesc('pd_musthave')
                ->orderByDesc('pd_date')
                ->limit($needed)
                ->get();

            $products = $products->concat($popular);
        }

        // 4. Attach sold counts + ratings (single query each) and map to the product DTO.
        [$soldCounts, $avgRatings] = $this->loadSoldCountsAndRatings(
            $products->pluck('pd_id')->filter()->unique()
        );

        $data = $products->values()->map(function ($product) use ($soldCounts, $avgRatings) {
            return $this->mapProduct(
                $product,
                (int) ($soldCounts[$product->pd_id] ?? 0),
                (float) ($avgRatings[$product->pd_id] ?? 0.0)
            );
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'source' => $source,                 // 'wishlist' = personalized, 'popular' = cold-start fallback
                'based_on_wishlist' => !empty($categoryIds),
                'seed_category_ids' => $categoryIds,
                'limit' => $limit,
                'count' => $data->count(),
            ],
        ]);
    }

    /**
     * Shared Product query (columns + relations) used by recommendations, matching the
     * shape mapProduct() expects. Only public-visible products.
     */
    private function baseRecommendationQuery()
    {
        return Product::query()
            ->select([
                'pd_id', 'pd_name', 'pd_description', 'pd_specifications', 'pd_material', 'pd_warranty',
                'pd_catid', 'pd_catsubid', 'pd_room_type', 'pd_brand_type', 'pd_supplier',
                'pd_price_srp', 'pd_price_dp', 'pd_price_member', 'pd_qty',
                'pd_prodpv',
                'pd_weight', 'pd_psweight', 'pd_pswidth', 'pd_pslenght', 'pd_psheight',
                'pd_assembly_required', 'pd_type', 'pd_musthave',
                'pd_bestseller', 'pd_salespromo', 'pd_status', 'pd_date',
                'pd_last_update', 'pd_parent_sku', 'pd_image',
            ])
            ->with([
                'photos:pp_id,pp_pdid,pp_filename,pp_varone,pp_date',
                'brand:pb_id,pb_name,pb_status',
                'variants:pv_id,pv_pdid,pv_sku,pv_name,pv_color,pv_color_hex,pv_size,pv_style,pv_width,pv_dimension,pv_height,pv_price_srp,pv_price_dp,pv_price_member,pv_prodpv,pv_qty,pv_status,pv_date',
                'variants.photos:pvp_id,pvp_pvid,pvp_filename,pvp_sort,pvp_date',
            ])
            ->whereIn('pd_status', [1, 2]);
    }

    /**
     * Pre-load sold counts and average ratings for a set of product ids in one query each
     * (avoids N+1). Returns [soldCounts, avgRatings] keyed by product id.
     */
    private function loadSoldCountsAndRatings($productIds): array
    {
        $soldCounts = [];
        $avgRatings = [];

        if ($productIds->isNotEmpty()) {
            $soldCounts = DB::table('tbl_checkout_history')
                ->whereIn('ch_product_id', $productIds)
                ->whereIn('ch_status', ['paid', 'completed', 'shipped'])
                ->selectRaw('ch_product_id, SUM(ch_quantity) as total_sold')
                ->groupBy('ch_product_id')
                ->pluck('total_sold', 'ch_product_id')
                ->toArray();

            $avgRatings = DB::table('tbl_product_reviews')
                ->whereIn('pr_product_id', $productIds)
                ->selectRaw('pr_product_id, AVG(pr_rating) as avg_rating')
                ->groupBy('pr_product_id')
                ->pluck('avg_rating', 'pr_product_id')
                ->map(fn ($rating) => (float) $rating)
                ->toArray();
        }

        return [$soldCounts, $avgRatings];
    }

    private function mapProduct($p, int $soldCount = 0, float $avgRating = 0.0): array
    {
        $images = $p->photos
            ->map(fn ($photo) => (string) $photo->pp_filename)
            ->filter(fn ($url) => trim($url) !== '')
            ->values()
            ->all();

        $primaryImage = $images[0] ?? ($p->pd_image ?? null);
        $effectiveQty = $p->pd_qty ?? 0;

        return [
            'id'          => (int)   $p->pd_id,
            'soldCount'    => (int)   $soldCount,
            'avgRating'    => (float) $avgRating,
            'supplierId'  => (int)   ($p->pd_supplier ?? 0),
            'name'        => (string) ($p->pd_name ?? ''),
            'description'       => $p->pd_description ?? null,
            'specifications'    => $p->pd_specifications ?? null,
            'material'          => $p->pd_material ?? null,
            'warranty'          => $p->pd_warranty ?? null,
            'catid'             => (int)   $p->pd_catid,
            'catsubid'          => (int)   $p->pd_catsubid,
            'roomType'          => (int)   ($p->pd_room_type ?? 0),
            'brandType'         => (int)   ($p->pd_brand_type ?? 0),
            'brand'             => $p->brand?->pb_name ? (string) $p->brand->pb_name : null,
            'priceSrp'          => $this->toNumber($p->pd_price_srp),
            'priceDp'           => $this->toNumber($p->pd_price_dp),
            'priceMember'       => $this->toNumber($p->pd_price_member),
            'prodpv'            => $this->toNumber($p->pd_prodpv),
            'qty'               => $effectiveQty,
            'weight'            => (int)   $p->pd_weight,
            'psweight'          => $this->toNumber($p->pd_psweight),
            'pswidth'           => $this->toNumber($p->pd_pswidth),
            'pslenght'          => $this->toNumber($p->pd_pslenght),
            'psheight'          => $this->toNumber($p->pd_psheight),
            'assemblyRequired'  => (bool) $p->pd_assembly_required,
            'type'        => (int)   $p->pd_type,
            'musthave'    => (bool)  $p->pd_musthave,
            'bestseller'  => (bool)  $p->pd_bestseller,
            'salespromo'  => (bool)  $p->pd_salespromo,
            'status'      => (int)   $p->pd_status,
            'sku'         => (string) ($p->pd_parent_sku ?? ''),
            'image'       => $primaryImage,
            'images'      => $images,
            'variants'    => $this->mapVariants($p),
            'createdAt'   => $p->pd_date ? $p->pd_date->format('Y-m-d') : null,
            'updatedAt'   => $p->pd_last_update ? $p->pd_last_update->format('Y-m-d') : null,
        ];
    }

    private function mapVariants($product): array
    {
        return $product->variants->map(function ($variant) {
            $images = $variant->photos
                ->map(fn ($photo) => (string) $photo->pvp_filename)
                ->filter(fn ($url) => trim($url) !== '')
                ->values()
                ->all();

            return [
                'id'       => (int) $variant->pv_id,
                'sku'      => (string) ($variant->pv_sku ?? ''),
                'name'     => (string) ($variant->pv_name ?? ''),
                'color'    => (string) ($variant->pv_color ?? ''),
                'colorHex' => (string) ($variant->pv_color_hex ?? ''),
                'size'     => (string) ($variant->pv_size ?? ''),
                'style'    => (string) ($variant->pv_style ?? ''),
                'width'    => $this->toOptionalNumber($variant->pv_width),
                'dimension' => $this->toOptionalNumber($variant->pv_dimension),
                'height'   => $this->toOptionalNumber($variant->pv_height),
                'priceSrp' => $this->toOptionalNumber($variant->pv_price_srp),
                'priceDp'  => $this->toOptionalNumber($variant->pv_price_dp),
                'priceMember' => $this->toOptionalNumber($variant->pv_price_member),
                'prodpv'   => $this->toOptionalNumber($variant->pv_prodpv),
                'qty'      => (int) ($variant->pv_qty ?? 0),
                'status'   => (int) ($variant->pv_status ?? 0),
                'images'   => $images,
                'createdAt'=> $variant->pv_date ? $variant->pv_date->format('Y-m-d') : null,
            ];
        })->all();
    }

    private function toNumber($value): float
    {
        if (is_null($value)) {
            return 0.0;
        }

        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        if (is_string($value)) {
            $normalized = preg_replace('/[^0-9.\-]/', '', $value) ?? '';
            if ($normalized === '' || $normalized === '-' || $normalized === '.') {
                return 0.0;
            }
            return is_numeric($normalized) ? (float) $normalized : 0.0;
        }

        return is_numeric($value) ? (float) $value : 0.0;
    }

    private function toOptionalNumber($value): ?float
    {
        if (is_null($value)) {
            return null;
        }

        if (is_string($value)) {
            $normalized = preg_replace('/[^0-9.\-]/', '', $value) ?? '';
            if ($normalized === '' || $normalized === '-' || $normalized === '.') {
                return null;
            }

            return is_numeric($normalized) ? (float) $normalized : null;
        }

        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:tbl_product,pd_id'],
            'product_name' => ['nullable', 'string', 'max:255'],
        ]);

        $productId = $request->integer('product_id');

        if (!$productId && $request->filled('product_name')) {
            $name = trim((string) $request->string('product_name'));
            $productId = Product::query()
                ->where('pd_name', $name)
                ->value('pd_id');
        }

        if (!$productId) {
            throw ValidationException::withMessages([
                'product_id' => ['Unable to resolve product. Provide a valid product_id or product_name.'],
            ]);
        }

        $wishlistItem = Wishlist::firstOrCreate([
            'cw_customer_id' => Auth::id(),
            'cw_product_id' => (int) $productId,
        ], [
            'cw_date' => now(),
        ]);

        // Get product details for broadcasting
        $product = Product::find($productId);

        // Broadcast real-time event
        try {
            WishlistAdded::dispatch(Auth::id(), $product, $wishlistItem, 'added');
        } catch (\Exception $e) {
            Log::warning('Failed to broadcast wishlist addition event', [
                'customer_id' => Auth::id(),
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);
        }

        // Invalidate customer-specific caches
        QueryOptimizerService::invalidateCustomerCaches(Auth::id());

        return response()->json(['message' => 'Added to wishlist']);
    }

    public function destroy(int $productId)
    {
        // Get product details before deletion for broadcasting
        $product = Product::find($productId);
        $wishlistItem = Wishlist::where('cw_customer_id', Auth::id())
            ->where('cw_product_id', $productId)
            ->first();

        Wishlist::where('cw_customer_id', Auth::id())
            ->where('cw_product_id', $productId)
            ->delete();

        // Broadcast real-time event
        try {
            WishlistAdded::dispatch(Auth::id(), $product, $wishlistItem, 'removed');
        } catch (\Exception $e) {
            Log::warning('Failed to broadcast wishlist removal event', [
                'customer_id' => Auth::id(),
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);
        }

        // Invalidate customer-specific caches
        QueryOptimizerService::invalidateCustomerCaches(Auth::id());

        return response()->json(['message' => 'Removed from wishlist']);
    }

    public function countByProduct(int $productId)
    {
        $count = Wishlist::where('cw_product_id', $productId)
            ->count();

        return response()->json([
            'product_id' => $productId,
            'wishlist_count' => $count,
        ]);
    }
}
