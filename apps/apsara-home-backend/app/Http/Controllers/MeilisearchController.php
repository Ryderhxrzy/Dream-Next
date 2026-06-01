<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\MeilisearchService;
use Illuminate\Http\Request;

class MeilisearchController extends Controller
{
    private MeilisearchService $meilisearch;

    public function __construct(MeilisearchService $meilisearch)
    {
        $this->meilisearch = $meilisearch;
    }

    /**
     * Search products
     */
    public function search(Request $request)
    {
        $query = $request->query('q');
        $limit = $request->query('limit', 20);

        if (!$query || strlen($query) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Query must be at least 2 characters',
                'results' => []
            ]);
        }

        $results = $this->meilisearch->searchProducts($query, $limit);

        return response()->json([
            'success' => true,
            'results' => $results['hits'] ?? [],
            'totalHits' => $results['estimatedTotalHits'] ?? 0,
            'processingTime' => $results['processingTimeMs'] ?? 0
        ]);
    }

    /**
     * Sync all products to Meilisearch
     */
    public function syncProducts()
    {
        try {
            // Get all products with necessary fields, including brand name
            $products = Product::select(
                'pd_id as id',
                'pd_name as name',
                'pd_brand_type as brand',
                'pd_price_dp as price',
                'pd_price_srp as priceSrp',
                'pd_price_member as priceMember',
                'pd_image as image',
                'pd_prodpv as prodpv',
                'pd_qty as qty',
                'pd_description as description',
                'tbl_product_brand.pb_name as brand_name'
            )
            ->leftJoin('tbl_product_brand', 'tbl_product.pd_brand_type', '=', 'tbl_product_brand.pb_id')
            ->get();

            $result = $this->meilisearch->indexProducts($products);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync single product
     */
    public function syncProduct($id)
    {
        try {
            $product = Product::select(
                'pd_id as id',
                'pd_name as name',
                'pd_brand_type as brand',
                'pd_price_dp as price',
                'pd_price_srp as priceSrp',
                'pd_price_member as priceMember',
                'pd_image as image',
                'pd_prodpv as prodpv',
                'pd_qty as qty',
                'pd_description as description',
                'tbl_product_brand.pb_name as brand_name'
            )
            ->leftJoin('tbl_product_brand', 'tbl_product.pd_brand_type', '=', 'tbl_product_brand.pb_id')
            ->findOrFail($id);

            $result = $this->meilisearch->indexProducts([$product]);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear index
     */
    public function clearIndex()
    {
        $result = $this->meilisearch->clearIndex();

        return response()->json([
            'success' => $result,
            'message' => $result ? 'Index cleared' : 'Failed to clear index'
        ]);
    }
}
