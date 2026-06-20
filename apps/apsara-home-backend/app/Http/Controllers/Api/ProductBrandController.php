<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductBrand;
use App\Models\ProductPhoto;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class ProductBrandController extends Controller
{
    private function buildBrandsResponse(string $search = '', bool $activeOnly = false, ?int $supplierId = null): JsonResponse
    {
        $hasBrandImageColumn = $this->hasBrandImageColumn();
        $hasSupplierColumn = $this->hasBrandSupplierColumn();
        $columns = ['pb_id', 'pb_name', 'pb_status'];
        if ($hasBrandImageColumn) {
            $columns[] = 'pb_image';
        }
        if ($hasSupplierColumn) {
            $columns[] = 'pb_supplier_id';
        }

        $brands = ProductBrand::query()
            ->select($columns)
            ->when($hasSupplierColumn, function ($query) {
                $query->with('supplier:s_id,s_company,s_name');
            })
            ->when($hasSupplierColumn && $supplierId, function ($query) use ($supplierId) {
                $query->where('pb_supplier_id', $supplierId);
            })
            ->when($activeOnly, function ($query) {
                $query->where('pb_status', 0);
            })
            ->when($search !== '', function ($q) use ($search) {
                $q->where('pb_name', 'ilike', '%' . $search . '%');
            })
            ->orderBy('pb_name')
            ->get()
            ->map(function (ProductBrand $brand) use ($hasBrandImageColumn, $hasSupplierColumn) {
                $merchant = $hasSupplierColumn ? $brand->supplier : null;

                return [
                    'id' => (int) $brand->pb_id,
                    'name' => (string) ($brand->pb_name ?? ''),
                    'image' => $hasBrandImageColumn && $brand->pb_image ? (string) $brand->pb_image : null,
                    'status' => (int) ($brand->pb_status ?? 0),
                    'supplier_id' => $hasSupplierColumn && $brand->pb_supplier_id ? (int) $brand->pb_supplier_id : null,
                    'supplier_name' => $merchant ? (string) ($merchant->s_company ?: $merchant->s_name) : null,
                ];
            })
            ->values();

        return response()->json([
            'brands' => $brands,
            'total' => $brands->count(),
        ]);
    }

    private function hasBrandImageColumn(): bool
    {
        return Schema::hasColumn('tbl_product_brand', 'pb_image');
    }

    private function hasBrandSupplierColumn(): bool
    {
        return Schema::hasColumn('tbl_product_brand', 'pb_supplier_id');
    }

    public function publicIndex(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));

        return $this->buildBrandsResponse($search, true);
    }

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        $supplierId = (int) $request->query('supplier_id', 0) ?: null;

        return $this->buildBrandsResponse($search, false, $supplierId);
    }

    /**
     * All products that belong to a brand (paginated), for the admin
     * brand-detail page (/admin/products/brands/{id}).
     */
    public function brandProducts(Request $request, int $id): JsonResponse
    {
        $brand = ProductBrand::query()->find($id);
        if (! $brand) {
            return response()->json(['message' => 'Brand not found.'], 404);
        }

        $search = trim((string) $request->query('q', ''));
        $perPage = min(max((int) $request->query('per_page', 24), 1), 100);

        $paginated = Product::query()
            ->where('pd_brand_type', $id)
            ->when($search !== '', fn ($q) => $q->where('pd_name', 'ilike', '%' . $search . '%'))
            ->orderBy('pd_name')
            ->paginate($perPage);

        $supplierIds = collect($paginated->items())
            ->pluck('pd_supplier')
            ->filter()
            ->unique()
            ->values()
            ->all();
        $suppliers = $supplierIds
            ? Supplier::query()->whereIn('s_id', $supplierIds)->get()->keyBy('s_id')
            : collect();

        $products = collect($paginated->items())->map(function (Product $p) use ($suppliers) {
            $supplier = $suppliers->get($p->pd_supplier);

            return [
                'id' => (int) $p->pd_id,
                'name' => (string) ($p->pd_name ?? ''),
                'image' => $p->pd_image ? (string) $p->pd_image : null,
                'price' => $p->pd_price_srp !== null ? (float) $p->pd_price_srp : null,
                'status' => (int) ($p->pd_status ?? 0),
                'supplier_name' => $supplier ? (string) ($supplier->s_company ?: $supplier->s_name) : null,
            ];
        })->values();

        return response()->json([
            'brand' => ['id' => (int) $brand->pb_id, 'name' => (string) $brand->pb_name],
            'products' => $products,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $hasBrandImageColumn = $this->hasBrandImageColumn();
        $hasSupplierColumn = $this->hasBrandSupplierColumn();

        $rules = [
            'pb_name' => 'required|string|max:105',
            'pb_image' => 'nullable|string|max:1000',
            'pb_status' => 'nullable|integer|in:0,1',
        ];
        if ($hasSupplierColumn) {
            // Strict ownership: every brand belongs to a merchant.
            $rules['supplier_id'] = 'required|integer|exists:tbl_supplier,s_id';
        }
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $name = trim((string) $request->input('pb_name'));

        $exists = ProductBrand::query()
            ->whereRaw('LOWER(pb_name) = ?', [mb_strtolower($name)])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'pb_name' => ['A brand with this name already exists.'],
                ],
            ], 422);
        }

        $payload = [
            'pb_name' => $name,
            'pb_status' => (int) $request->input('pb_status', 0),
        ];

        if ($hasBrandImageColumn) {
            $payload['pb_image'] = $request->filled('pb_image') ? (string) $request->input('pb_image') : null;
        }

        if ($hasSupplierColumn) {
            $payload['pb_supplier_id'] = (int) $request->input('supplier_id');
        }

        $brand = ProductBrand::create($payload);

        if ($hasSupplierColumn) {
            $brand->load('supplier:s_id,s_company,s_name');
        }

        return response()->json([
            'message' => 'Brand created successfully.',
            'brand' => [
                'id' => (int) $brand->pb_id,
                'name' => (string) $brand->pb_name,
                'image' => $hasBrandImageColumn && $brand->pb_image ? (string) $brand->pb_image : null,
                'status' => (int) $brand->pb_status,
                'supplier_id' => $hasSupplierColumn && $brand->pb_supplier_id ? (int) $brand->pb_supplier_id : null,
                'supplier_name' => ($hasSupplierColumn && $brand->supplier)
                    ? (string) ($brand->supplier->s_company ?: $brand->supplier->s_name)
                    : null,
            ],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $brand = ProductBrand::query()->find($id);
        if (! $brand) {
            return response()->json(['message' => 'Brand not found.'], 404);
        }

        $hasBrandImageColumn = $this->hasBrandImageColumn();

        $validator = Validator::make($request->all(), [
            'pb_name' => 'sometimes|required|string|max:105',
            'pb_image' => 'nullable|string|max:1000',
            'pb_status' => 'nullable|integer|in:0,1',
            'supplier_id' => 'sometimes|nullable|integer|exists:tbl_supplier,s_id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->has('pb_name')) {
            $name = trim((string) $request->input('pb_name'));
            $exists = ProductBrand::query()
                ->where('pb_id', '!=', $brand->pb_id)
                ->whereRaw('LOWER(pb_name) = ?', [mb_strtolower($name)])
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'Validation failed.',
                    'errors' => [
                        'pb_name' => ['A brand with this name already exists.'],
                    ],
                ], 422);
            }

            $brand->pb_name = $name;
        }

        if ($hasBrandImageColumn && $request->exists('pb_image')) {
            $brand->pb_image = $request->filled('pb_image') ? (string) $request->input('pb_image') : null;
        }

        if ($request->has('pb_status')) {
            $brand->pb_status = (int) $request->input('pb_status', 0);
        }

        if ($this->hasBrandSupplierColumn() && $request->has('supplier_id')) {
            $brand->pb_supplier_id = (int) $request->input('supplier_id') ?: null;
        }

        $brand->save();

        return response()->json([
            'message' => 'Brand updated successfully.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $brand = ProductBrand::query()->find($id);
        if (! $brand) {
            return response()->json(['message' => 'Brand not found.'], 404);
        }

        $inUse = Product::query()->where('pd_brand_type', $brand->pb_id)->exists();
        if ($inUse) {
            return response()->json([
                'message' => 'This brand is still assigned to one or more products.',
            ], 422);
        }

        $brand->delete();

        return response()->json([
            'message' => 'Brand deleted successfully.',
        ]);
    }

    public function showAllWithProducts(Request $request): JsonResponse
    {
        $hasBrandImageColumn = $this->hasBrandImageColumn();

        // Get all active brands
        $brands = ProductBrand::query()
            ->select(['pb_id', 'pb_name', 'pb_status'])
            ->when($hasBrandImageColumn, function ($query) {
                $query->addSelect('pb_image');
            })
            ->where('pb_status', 0) // Only active brands
            ->orderBy('pb_name')
            ->get();

        // Get product counts for all brands (only active products)
        $brandProductCounts = Product::query()
            ->select('pd_brand_type', Product::raw('COUNT(*) as total_products'))
            ->whereIn('pd_status', [1, 2]) // Only active products
            ->whereNotNull('pd_brand_type')
            ->groupBy('pd_brand_type')
            ->pluck('total_products', 'pd_brand_type')
            ->toArray();

        // Simplified brand data with only logo, brand name, and total products
        $brandsData = $brands->map(function ($brand) use ($brandProductCounts, $hasBrandImageColumn) {
            $brandData = [
                'id' => (int) $brand->pb_id,
                'name' => (string) $brand->pb_name,
                'total_products' => $brandProductCounts[$brand->pb_id] ?? 0,
            ];

            // Add brand logo if the column exists
            if ($hasBrandImageColumn) {
                $brandData['logo'] = $brand->pb_image ? (string) $brand->pb_image : null;
            }

            return $brandData;
        });

        return response()->json([
            'brands' => $brandsData,
            'total_brands' => $brandsData->count(),
        ]);
    }

    public function shopByBrands(): JsonResponse
    {
        $hasBrandImageColumn = $this->hasBrandImageColumn();

        // Get product counts for all brands
        $brandProductCounts = Product::query()
            ->select('pd_brand_type', Product::raw('COUNT(*) as total_products'))
            ->whereIn('pd_status', [1, 2])
            ->whereNotNull('pd_brand_type')
            ->groupBy('pd_brand_type')
            ->pluck('total_products', 'pd_brand_type')
            ->toArray();

        $brands = ProductBrand::query()
            ->select(['pb_id', 'pb_name'])
            ->when($hasBrandImageColumn, function ($query) {
                $query->addSelect('pb_image');
            })
            ->where('pb_status', 0)
            ->orderBy('pb_name')
            ->get()
            ->map(function ($brand) use ($hasBrandImageColumn, $brandProductCounts) {
                $brandData = [
                    'id' => (int) $brand->pb_id,
                    'name' => (string) $brand->pb_name,
                    'total_products' => $brandProductCounts[$brand->pb_id] ?? 0,
                ];

                if ($hasBrandImageColumn) {
                    $brandData['image'] = $brand->pb_image ? (string) $brand->pb_image : null;
                }

                return $brandData;
            });

        return response()->json([
            'brands' => $brands,
        ]);
    }

    public function debugBrandImages(int $id): JsonResponse
    {
        $brand = ProductBrand::query()->find($id);
        if (! $brand) {
            return response()->json(['message' => 'Brand not found.'], 404);
        }

        // Get all products for this brand
        $allProducts = Product::query()
            ->select(['pd_id', 'pd_name', 'pd_image', 'pd_status'])
            ->with(['photos:pp_id,pp_pdid,pp_filename'])
            ->where('pd_brand_type', $id)
            ->orderBy('pd_date', 'desc')
            ->get();

        $debugData = [
            'brand_id' => $id,
            'brand_name' => $brand->pb_name,
            'brand_status' => $brand->pb_status,
            'total_products_found' => $allProducts->count(),
            'products' => []
        ];

        foreach ($allProducts as $product) {
            $productData = [
                'id' => $product->pd_id,
                'name' => $product->pd_name,
                'status' => $product->pd_status,
                'main_image' => $product->pd_image,
                'main_image_exists' => !empty(trim($product->pd_image ?? '')),
                'photos_count' => $product->photos->count(),
                'photos' => []
            ];

            foreach ($product->photos as $photo) {
                $productData['photos'][] = [
                    'id' => $photo->pp_id,
                    'filename' => $photo->pp_filename,
                    'is_empty' => empty(trim($photo->pp_filename ?? ''))
                ];
            }

            $debugData['products'][] = $productData;
        }

        return response()->json($debugData);
    }

    public function profile(int $id): JsonResponse
    {
        $brand = ProductBrand::query()->find($id);
        if (! $brand) {
            return response()->json(['message' => 'Brand not found.'], 404);
        }

        $hasBrandImageColumn = $this->hasBrandImageColumn();

        // Get total products for this brand
        $totalProducts = Product::query()
            ->where('pd_brand_type', $id)
            ->whereIn('pd_status', [1, 2]) // Only active products
            ->count();

        // Get brand rating from all products of this brand
        $ratingData = DB::table('tbl_product_reviews as r')
            ->join('tbl_product as p', 'p.pd_id', '=', 'r.pr_product_id')
            ->where('p.pd_brand_type', $id)
            ->where('p.pd_status', [1, 2]) // Only active products
            ->selectRaw('COALESCE(SUM(r.pr_rating), 0) as total_stars, COUNT(*) as review_count')
            ->first();

        $overallRating = $ratingData && (int) ($ratingData->review_count ?? 0) > 0
            ? round(((float) ($ratingData->total_stars ?? 0)) / (int) $ratingData->review_count, 2)
            : null;

        $totalReviews = $ratingData ? (int) $ratingData->review_count : 0;

        // Get supplier information and joined date
        $supplierInfo = DB::table('tbl_product as p')
            ->join('tbl_supplier as s', 's.s_id', '=', 'p.pd_supplier')
            ->leftJoin('tbl_supplier_user as su', 'su.su_supplier', '=', 's.s_id')
            ->where('p.pd_brand_type', $id)
            ->select('s.s_name as supplier_name', 'su.su_date_created as joined_date')
            ->first();

        // Calculate chat performance (mock calculation - you may need to adjust based on your business logic)
        $chatPerformance = 95; // Default value, you can calculate this based on actual chat metrics

        $brandData = [
            'id' => (int) $brand->pb_id,
            'name' => (string) $brand->pb_name,
            'profile_picture' => $hasBrandImageColumn && $brand->pb_image ? (string) $brand->pb_image : null,
            'status' => (int) ($brand->pb_status ?? 0),
            'is_online' => true, // You may want to implement actual online status logic
            'chat_performance' => $chatPerformance,
            'overall_rating' => $overallRating,
            'total_reviews' => $totalReviews,
            'total_products' => $totalProducts,
            'joined_date' => $supplierInfo?->joined_date ? $supplierInfo->joined_date : null,
            'supplier_name' => $supplierInfo?->supplier_name ? (string) $supplierInfo->supplier_name : null,
        ];

        return response()->json([
            'brand' => $brandData,
        ]);
    }
}
