<?php

namespace App\Services;

use MeiliSearch\Client;

class MeilisearchService
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client(
            env('MEILI_HOST'),
            env('MEILI_MASTER_KEY')
        );
    }

    /**
     * Search products
     */
    public function searchProducts($query, $limit = 20)
    {
        try {
            $results = $this->client
                ->index('products')
                ->search($query, [
                    'limit' => $limit,
                ]);

            return [
                'hits' => $results->getHits(),
                'estimatedTotalHits' => $results->getEstimatedTotalHits(),
                'processingTimeMs' => $results->getProcessingTimeMs(),
            ];
        } catch (\Exception $e) {
            \Log::error('Meilisearch search error: ' . $e->getMessage());
            return [
                'hits' => [],
                'estimatedTotalHits' => 0,
                'processingTimeMs' => 0,
            ];
        }
    }

    /**
     * Index products
     */
    public function indexProducts($products)
    {
        try {
            // Convert collection to array if needed
            $documents = $products instanceof \Illuminate\Database\Eloquent\Collection
                ? $products->toArray()
                : $products;

            $this->client
                ->index('products')
                ->addDocuments($documents, 'id');

            return [
                'success' => true,
                'message' => count($documents) . ' products indexed'
            ];
        } catch (\Exception $e) {
            \Log::error('Meilisearch indexing error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Delete product from index
     */
    public function deleteProduct($productId)
    {
        try {
            $this->client
                ->index('products')
                ->deleteDocument($productId);

            return true;
        } catch (\Exception $e) {
            \Log::error('Meilisearch delete error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Clear all products index
     */
    public function clearIndex()
    {
        try {
            $this->client
                ->index('products')
                ->deleteAllDocuments();

            return true;
        } catch (\Exception $e) {
            \Log::error('Meilisearch clear error: ' . $e->getMessage());
            return false;
        }
    }
}
