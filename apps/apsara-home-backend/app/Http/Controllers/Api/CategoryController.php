<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SupplierCategoryAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        $supplierId = (int) $request->query('supplier_id', 0);
        $usedOnly = $request->boolean('used_only', false);
        $brandType = (int) $request->query('brand_type', 0);
        $assignedCategoryIds = $supplierId > 0
            ? SupplierCategoryAccess::query()
                ->where('supplier_id', $supplierId)
                ->where(function ($q) {
                    $q->whereNull('is_supplier_created')
                      ->orWhere('is_supplier_created', false);
                })
                ->pluck('category_id')
                ->map(fn ($id) => (int) $id)
                ->all()
            : [];

        $productCounts = DB::table('tbl_product')
            ->selectRaw('pd_catid as category_id, COUNT(*) as total')
            ->whereIn('pd_status', [1, 2])
            ->when($supplierId > 0, function ($query) use ($supplierId) {
                $query->where('pd_supplier', $supplierId);
            })
            ->groupBy('pd_catid')
            ->pluck('total', 'category_id');

        $productImages = DB::table('tbl_product')
            ->select(['pd_catid as category_id', 'pd_image'])
            ->whereIn('pd_status', [1, 2])
            ->when($supplierId > 0, function ($query) use ($supplierId) {
                $query->where('pd_supplier', $supplierId);
            })
            ->orderByDesc('pd_id')
            ->get()
            ->groupBy('category_id')
            ->map(function ($rows) {
                return collect($rows)
                    ->pluck('pd_image')
                    ->filter(fn ($image) => is_string($image) && trim($image) !== '')
                    ->map(fn ($image) => $this->normalizeCategoryImage($image))
                    ->filter()
                    ->take(5)
                    ->values()
                    ->all();
            });

        $categories = Category::select([
                'cat_id', 'cat_name', 'cat_description',
                'cat_url', 'cat_image', 'cat_order', 'parent_id',
            ])
            ->when($usedOnly && $supplierId > 0, function ($query) use ($productCounts) {
                $categoryIds = collect($productCounts)->keys()->map(fn ($id) => (int) $id)->all();
                $query->whereIn('cat_id', !empty($categoryIds) ? $categoryIds : [-1]);
            })
            ->when($brandType > 0, function ($query) use ($brandType) {
                $brandProducts = DB::table('tbl_product')
                    ->where('pd_brand_type', $brandType)
                    ->whereIn('pd_status', [1, 2])
                    ->get(['pd_catid', 'pd_merchant_catid', 'pd_supplier']);

                $fromCatId = $brandProducts->pluck('pd_catid')
                    ->map(fn ($id) => (int) $id)
                    ->filter(fn ($id) => $id > 0)
                    ->values()->all();

                $fromMerchantCatId = $brandProducts->pluck('pd_merchant_catid')
                    ->filter(fn ($id) => $id !== null)
                    ->map(fn ($id) => (int) $id)
                    ->filter(fn ($id) => $id > 0)
                    ->values()->all();

                // Include all supplier-created merchant categories for suppliers who sell this brand
                $supplierIds = $brandProducts->pluck('pd_supplier')
                    ->filter(fn ($id) => $id !== null && (int) $id > 0)
                    ->map(fn ($id) => (int) $id)
                    ->unique()->values()->all();

                $supplierMerchantCatIds = !empty($supplierIds)
                    ? DB::table('tbl_supplier_category_access as sca')
                        ->join('tbl_category as c', 'sca.category_id', '=', 'c.cat_id')
                        ->whereIn('sca.supplier_id', $supplierIds)
                        ->where('c.is_supplier_created', true)
                        ->pluck('sca.category_id')
                        ->map(fn ($id) => (int) $id)
                        ->all()
                    : [];

                $directIds = array_values(array_unique(array_merge($fromCatId, $fromMerchantCatId, $supplierMerchantCatIds)));

                // Also include child categories of any matched parent categories
                $childIds = !empty($directIds)
                    ? DB::table('tbl_category')
                        ->whereIn('parent_id', $directIds)
                        ->pluck('cat_id')
                        ->map(fn ($id) => (int) $id)
                        ->all()
                    : [];

                $allCategoryIds = array_values(array_unique(array_merge($directIds, $childIds)));
                $query->whereIn('cat_id', !empty($allCategoryIds) ? $allCategoryIds : [-1]);
            })
            ->when($supplierId > 0, function ($query) use ($assignedCategoryIds) {
                $ids = !empty($assignedCategoryIds) ? $assignedCategoryIds : [-1];
                $query->where(function ($q) use ($ids) {
                    $q->whereIn('cat_id', $ids)
                      ->orWhereIn('parent_id', $ids);
                });
            })
            ->when($supplierId <= 0 && $brandType <= 0, function ($query) {
                // Global list: never expose supplier-created categories to admin assign modal.
                // When filtering by brand, include all categories (supplier-created or not).
                $query->where(function ($q) {
                    $q->whereNull('is_supplier_created')
                      ->orWhere('is_supplier_created', false);
                });
            })
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . $search . '%';
                $q->where(function ($inner) use ($like) {
                    $inner->where('cat_name', 'ilike', $like)
                          ->orWhere('cat_description', 'ilike', $like)
                          ->orWhere('cat_url', 'ilike', $like);
                });
            })
            ->orderBy('cat_order')
            ->orderByDesc('cat_id')
            ->get()
            ->map(fn (Category $c) => [
                'id'          => (int)    $c->cat_id,
                'name'        => $this->normalizeText((string) ($c->cat_name ?? '')),
                'description' => $this->normalizeText((string) ($c->cat_description ?? '')),
                'url'         => (string) ($c->cat_url ?? ''),
                'image'       => $this->normalizeCategoryImage($c->cat_image),
                'images'      => $productImages[(int) $c->cat_id] ?? [],
                'order'         => (int)    $c->cat_order,
                'product_count' => (int)   ($productCounts[(int) $c->cat_id] ?? 0),
                'parent_id'     => $c->parent_id ? (int) $c->parent_id : null,
            ])
            ->values();

        return response()->json([
            'categories' => $categories,
            'total'      => $categories->count(),
        ]);
    }

    public function shopByCategories(): JsonResponse
    {
        $productImages = DB::table('tbl_product')
            ->select(['pd_catid as category_id', 'pd_image'])
            ->whereIn('pd_status', [1, 2])
            ->orderByDesc('pd_id')
            ->get()
            ->groupBy('category_id')
            ->map(function ($rows) {
                return collect($rows)
                    ->pluck('pd_image')
                    ->filter(fn ($image) => is_string($image) && trim($image) !== '')
                    ->map(fn ($image) => $this->normalizeCategoryImage($image))
                    ->filter()
                    ->first();
            });

        $categories = Category::select(['cat_id', 'cat_name', 'cat_url', 'cat_image'])
            ->orderBy('cat_order')
            ->orderByDesc('cat_id')
            ->get()
            ->map(fn (Category $c) => [
                'id'    => (int)    $c->cat_id,
                'name'  => $this->normalizeText((string) ($c->cat_name ?? '')),
                'url'   => (string) ($c->cat_url ?? ''),
                'image' => $productImages[(int) $c->cat_id] ?? $this->normalizeCategoryImage($c->cat_image),
            ])
            ->values();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cat_name'        => 'required|string|max:50',
            'cat_description' => 'nullable|string|max:200',
            'cat_url'         => 'nullable|string|max:40',
            'cat_order'       => 'nullable|integer|min:0',
            'parent_id'       => 'nullable|integer|exists:tbl_category,cat_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $slug = $request->cat_url
            ? Str::slug($request->cat_url)
            : Str::slug($request->cat_name);

        $category = Category::create([
            'cat_name'        => trim($request->cat_name),
            'cat_description' => trim($request->cat_description ?? ''),
            'cat_url'         => $slug,
            'cat_image'       => '0',
            'cat_order'       => (int) ($request->cat_order ?? 0),
            'parent_id'       => $request->parent_id ? (int) $request->parent_id : null,
        ]);

        return response()->json([
            'message'  => 'Category created successfully.',
            'category' => [
                'id'   => $category->cat_id,
                'name' => $category->cat_name,
                'url'  => $category->cat_url,
            ],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::find($id);
        if (! $category) {
            return response()->json(['message' => 'Category not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'cat_name'        => 'sometimes|required|string|max:50',
            'cat_description' => 'nullable|string|max:200',
            'cat_url'         => 'nullable|string|max:40',
            'cat_order'       => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('cat_name')) {
            $category->cat_name = trim($request->cat_name);
        }

        if ($request->has('cat_description')) {
            $category->cat_description = trim($request->cat_description ?? '');
        }

        if ($request->has('cat_url') && $request->cat_url) {
            $category->cat_url = Str::slug($request->cat_url);
        } elseif ($request->has('cat_name') && ! $request->has('cat_url')) {
            $category->cat_url = Str::slug($request->cat_name);
        }

        if ($request->has('cat_order')) {
            $category->cat_order = (int) $request->cat_order;
        }

        $category->save();

        return response()->json(['message' => 'Category updated successfully.']);
    }

    public function destroy(int $id): JsonResponse
    {
        $category = Category::find($id);
        if (! $category) {
            return response()->json(['message' => 'Category not found.'], 404);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully.']);
    }

    private function normalizeCategoryImage(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $image = trim($value);
        if ($image === '' || $image === '0') {
            return null;
        }

        if (Str::startsWith($image, ['http://', 'https://', '//', 'data:'])) {
            return $image;
        }

        $base = rtrim((string) config('app.url'), '/');
        return $base !== '' ? $base . '/' . ltrim($image, '/') : $image;
    }

    private function normalizeText(string $value): string
    {
        $clean = trim($value);
        if ($clean === '') {
            return '';
        }

        if (preg_match('/Ã.|Â./', $clean)) {
            $decoded = @utf8_decode($clean);
            $converted = @mb_convert_encoding($decoded, 'UTF-8', 'ISO-8859-1');
            if (is_string($converted) && $converted !== '') {
                $clean = $converted;
            }
        }

        return $clean;
    }
}
