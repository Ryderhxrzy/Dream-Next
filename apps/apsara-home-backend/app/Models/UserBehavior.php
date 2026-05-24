<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBehavior extends Model
{
    protected $table = 'tbl_user_behavior';
    protected $primaryKey = 'ub_id';
    public $timestamps = true;

    protected $fillable = [
        'ub_user_id',
        'ub_behavior_type',
        'ub_product_id',
        'ub_category_id',
        'ub_brand_id',
        'ub_search_query',
        'ub_metadata',
    ];

    protected $casts = [
        'ub_metadata' => 'array', // Cast JSON to array
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: User Behavior belongs to Customer
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'ub_user_id', 'c_userid');
    }

    /**
     * Relationship: User Behavior belongs to Product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'ub_product_id', 'p_id');
    }

    /**
     * Scope: Get behaviors for a specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('ub_user_id', $userId);
    }

    /**
     * Scope: Get behaviors of specific type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('ub_behavior_type', $type);
    }

    /**
     * Scope: Get recent behaviors (default last 30 days)
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Get user's top viewed categories
     */
    public static function getTopCategoriesForUser($userId, $limit = 5)
    {
        return self::forUser($userId)
            ->whereIn('ub_behavior_type', ['product_view', 'product_click', 'purchase', 'wishlist_add', 'cart_add'])
            ->whereNotNull('ub_category_id')
            ->selectRaw('ub_category_id, COUNT(*) as count')
            ->groupBy('ub_category_id')
            ->orderByDesc('count')
            ->limit($limit)
            ->get();
    }

    /**
     * Get user's top viewed brands
     */
    public static function getTopBrandsForUser($userId, $limit = 5)
    {
        return self::forUser($userId)
            ->whereIn('ub_behavior_type', ['product_view', 'product_click', 'purchase'])
            ->whereNotNull('ub_brand_id')
            ->selectRaw('ub_brand_id, COUNT(*) as count')
            ->groupBy('ub_brand_id')
            ->orderByDesc('count')
            ->limit($limit)
            ->get();
    }

    /**
     * Get user's recent search queries
     */
    public static function getRecentSearchesForUser($userId, $limit = 10)
    {
        return self::forUser($userId)
            ->where('ub_behavior_type', 'search')
            ->whereNotNull('ub_search_query')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->pluck('ub_search_query')
            ->toArray();
    }

    /**
     * Get user's recently viewed product IDs (for exclusion in recommendations)
     */
    public static function getRecentlyViewedProductIds($userId, $limit = 50)
    {
        return self::forUser($userId)
            ->where('ub_behavior_type', 'product_view')
            ->whereNotNull('ub_product_id')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->pluck('ub_product_id')
            ->toArray();
    }

    /**
     * Record a behavior event
     */
    public static function recordBehavior(
        $userId,
        $behaviorType,
        $productId = null,
        $categoryId = null,
        $brandId = null,
        $searchQuery = null,
        $metadata = null
    ) {
        return self::create([
            'ub_user_id' => $userId,
            'ub_behavior_type' => $behaviorType,
            'ub_product_id' => $productId,
            'ub_category_id' => $categoryId,
            'ub_brand_id' => $brandId,
            'ub_search_query' => $searchQuery,
            'ub_metadata' => $metadata,
        ]);
    }
}
