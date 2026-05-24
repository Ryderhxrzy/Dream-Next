<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserBehavior;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserBehaviorController extends Controller
{
    /**
     * Track user behavior
     */
    public function track(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'behavior_type' => 'required|in:search,product_view,product_click,wishlist_add,wishlist_remove,cart_add,cart_remove,purchase,category_view,brand_view',
                'product_id' => 'nullable|integer',
                'category_id' => 'nullable|integer',
                'brand_id' => 'nullable|integer',
                'search_query' => 'nullable|string|max:255',
                'metadata' => 'nullable|array',
            ]);

            $userId = auth()->id();

            UserBehavior::recordBehavior(
                userId: $userId,
                behaviorType: $validated['behavior_type'],
                productId: $validated['product_id'] ?? null,
                categoryId: $validated['category_id'] ?? null,
                brandId: $validated['brand_id'] ?? null,
                searchQuery: $validated['search_query'] ?? null,
                metadata: $validated['metadata'] ?? null,
            );

            return response()->json([
                'success' => true,
                'message' => 'Behavior tracked successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to track behavior',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get recommendations for authenticated user
     */
    public function getRecommendations(Request $request): JsonResponse
    {
        try {
            $userId = auth()->id();
            $limit = $request->query('limit', 20);

            // Get user's top viewed categories
            $topCategories = UserBehavior::getTopCategoriesForUser($userId, 5);
            $categoryIds = $topCategories->pluck('ub_category_id')->toArray();

            // Get recently viewed product IDs to exclude
            $viewedProductIds = UserBehavior::getRecentlyViewedProductIds($userId, 50);

            if (empty($categoryIds)) {
                // Fallback: Return trending products if user has no history
                $recommendations = Product::where('p_status', 1)
                    ->orderByDesc('p_sold_count')
                    ->limit($limit)
                    ->select(
                        'p_id as id',
                        'p_name as name',
                        'p_image as image',
                        'p_price_member as priceMember',
                        'p_price_srp as priceSrp',
                        'p_sold_count as soldCount'
                    )
                    ->get();
            } else {
                // Get products from user's top categories, excluding already viewed
                $recommendations = Product::whereIn('p_category_id', $categoryIds)
                    ->where('p_status', 1)
                    ->whereNotIn('p_id', $viewedProductIds)
                    ->orderByDesc('p_sold_count')
                    ->limit($limit)
                    ->select(
                        'p_id as id',
                        'p_name as name',
                        'p_image as image',
                        'p_price_member as priceMember',
                        'p_price_srp as priceSrp',
                        'p_sold_count as soldCount'
                    )
                    ->get();
            }

            return response()->json([
                'success' => true,
                'data' => $recommendations,
                'count' => count($recommendations),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recommendations',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user's recent searches
     */
    public function getRecentSearches(Request $request): JsonResponse
    {
        try {
            $userId = auth()->id();
            $limit = $request->query('limit', 10);

            $searches = UserBehavior::forUser($userId)
                ->where('ub_behavior_type', 'search')
                ->whereNotNull('ub_search_query')
                ->orderByDesc('created_at')
                ->limit($limit)
                ->pluck('ub_search_query')
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => array_unique($searches), // Remove duplicates
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch searches',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user's behavior stats
     */
    public function getStats(Request $request): JsonResponse
    {
        try {
            $userId = auth()->id();
            $days = $request->query('days', 30);

            $behaviorCounts = UserBehavior::forUser($userId)
                ->recent($days)
                ->selectRaw('ub_behavior_type, COUNT(*) as count')
                ->groupBy('ub_behavior_type')
                ->get()
                ->keyBy('ub_behavior_type');

            $topCategories = UserBehavior::getTopCategoriesForUser($userId, 5);
            $topBrands = UserBehavior::getTopBrandsForUser($userId, 5);

            return response()->json([
                'success' => true,
                'data' => [
                    'behavior_counts' => $behaviorCounts,
                    'top_categories' => $topCategories,
                    'top_brands' => $topBrands,
                    'period_days' => $days,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear user behavior (for testing/privacy)
     */
    public function clearBehavior(Request $request): JsonResponse
    {
        try {
            $userId = auth()->id();
            $behaviorType = $request->query('type'); // Optional: clear only specific type

            if ($behaviorType) {
                UserBehavior::forUser($userId)
                    ->where('ub_behavior_type', $behaviorType)
                    ->delete();
            } else {
                UserBehavior::forUser($userId)->delete();
            }

            return response()->json([
                'success' => true,
                'message' => 'Behavior cleared successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear behavior',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
