<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\SupplierCategoryAccess;
use App\Models\SupplierUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SupplierController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $this->normalizeMissingSupplierIds();

        $admin = $this->resolveAdmin($request);
        if (! $admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $now = now('Asia/Manila');
        $paidStatuses = ['paid', 'succeeded', 'success'];

        $totalSuppliers = (int) Supplier::query()->count();
        $activeSuppliers = (int) Supplier::query()->where('s_status', 1)->count();
        $supplierUsers = (int) SupplierUser::query()->count();

        $suppliersWithProducts = (int) Product::query()
            ->whereNotNull('pd_supplier')
            ->where('pd_supplier', '>', 0)
            ->distinct('pd_supplier')
            ->count('pd_supplier');

        $salesBase = DB::table('tbl_checkout_history as ch')
            ->join('tbl_product as p', 'p.pd_id', '=', 'ch.ch_product_id')
            ->whereNotNull('p.pd_supplier')
            ->where('p.pd_supplier', '>', 0)
            ->whereIn('ch.ch_status', $paidStatuses);

        $suppliersWithSales = (int) (clone $salesBase)
            ->distinct('p.pd_supplier')
            ->count('p.pd_supplier');

        $supplierPaidOrders = (int) (clone $salesBase)->count();
        $supplierSalesAmount = round((float) (clone $salesBase)->sum('ch.ch_amount'), 2);

        $newSuppliersThisMonth = 0;
        if (Schema::hasColumn('tbl_supplier_user', 'su_date_created')) {
            $monthStart = $now->copy()->startOfMonth()->utc();
            $monthEnd = $now->copy()->endOfMonth()->utc();

            $newSuppliersThisMonth = (int) DB::table('tbl_supplier_user')
                ->whereNotNull('su_supplier')
                ->where('su_supplier', '>', 0)
                ->whereBetween('su_date_created', [$monthStart, $monthEnd])
                ->distinct('su_supplier')
                ->count('su_supplier');
        }

        return response()->json([
            'summary' => [
                'total_suppliers' => $totalSuppliers,
                'active_suppliers' => $activeSuppliers,
                'supplier_users' => $supplierUsers,
                'suppliers_with_products' => $suppliersWithProducts,
                'suppliers_with_sales' => $suppliersWithSales,
                'new_suppliers_this_month' => $newSuppliersThisMonth,
                'supplier_paid_orders' => $supplierPaidOrders,
                'supplier_sales_amount' => $supplierSalesAmount,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->normalizeMissingSupplierIds();

        $admin = $this->resolveAdmin($request);
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $admin && ! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Supplier::query()->with('brand')->orderBy('s_company')->orderBy('s_name');

        if ($supplierUser) {
            $query->where('s_id', (int) $supplierUser->su_supplier);
        } elseif ($this->roleFromLevel((int) $admin->user_level_id) === 'supplier_admin') {
            if (! $admin->supplier_id) {
                return response()->json(['suppliers' => []]);
            }

            $query->where('s_id', (int) $admin->supplier_id);
        }

        return response()->json([
            'suppliers' => $query->get()->map(fn (Supplier $supplier) => $this->transform($supplier))->values(),
        ]);
    }

    public function categories(Request $request, int $id): JsonResponse
    {
        $admin = $this->resolveAdmin($request);
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $admin && ! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplier = $this->resolveAccessibleSupplier($id, $admin, $supplierUser);
        if (! $supplier) {
            return response()->json(['message' => 'Supplier company not found.'], 404);
        }

        return response()->json([
            'supplier_id' => (int) $supplier->s_id,
            'categories' => $this->assignedCategories((int) $supplier->s_id),
        ]);
    }

    public function syncCategories(Request $request, int $id): JsonResponse
    {
        $admin = $this->resolveAdmin($request);
        if (! $admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplier = Supplier::query()->find($id);
        if (! $supplier) {
            return response()->json(['message' => 'Supplier company not found.'], 404);
        }

        $validated = $request->validate([
            'category_ids' => 'array',
            'category_ids.*' => 'integer|exists:tbl_category,cat_id',
        ]);

        $categoryIds = collect($validated['category_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        DB::transaction(function () use ($supplier, $categoryIds) {
            SupplierCategoryAccess::query()
                ->where('supplier_id', (int) $supplier->s_id)
                ->delete();

            foreach ($categoryIds as $categoryId) {
                SupplierCategoryAccess::query()->create([
                    'supplier_id' => (int) $supplier->s_id,
                    'category_id' => $categoryId,
                    'created_at' => now(),
                ]);
            }
        });

        return response()->json([
            'message' => 'Supplier category access updated successfully.',
            'supplier_id' => (int) $supplier->s_id,
            'categories' => $this->assignedCategories((int) $supplier->s_id),
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeMissingSupplierIds();

        $admin = $this->resolveAdmin($request);
        if (! $admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'contact' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'status' => 'nullable|integer|in:0,1',
            'brand_id' => 'required|integer|exists:tbl_product_brand,pb_id',
        ]);

        $supplier = Supplier::query()->create([
            's_name' => trim((string) $validated['name']),
            's_company' => trim((string) $validated['company']),
            's_email' => trim((string) ($validated['email'] ?? '')),
            's_contact' => trim((string) ($validated['contact'] ?? '')),
            's_address' => trim((string) ($validated['address'] ?? '')),
            's_brand_id' => (int) $validated['brand_id'],
            's_status' => (int) ($validated['status'] ?? 1),
        ]);

        $this->normalizeMissingSupplierIds();
        $supplier = Supplier::query()
            ->where('s_company', trim((string) $validated['company']))
            ->where('s_name', trim((string) $validated['name']))
            ->orderByDesc('s_id')
            ->first() ?? $supplier;

        return response()->json([
            'message' => 'Supplier company created successfully.',
            'supplier' => $this->transform($supplier),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $this->normalizeMissingSupplierIds();

        $admin = $this->resolveAdmin($request);
        if (! $admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplier = Supplier::query()->find($id);
        if (! $supplier) {
            return response()->json(['message' => 'Supplier company not found.'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'contact' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'status' => 'nullable|integer|in:0,1',
            'brand_id' => 'nullable|integer|exists:tbl_product_brand,pb_id',
        ]);

        $supplier->fill([
            's_name' => trim((string) $validated['name']),
            's_company' => trim((string) $validated['company']),
            's_email' => trim((string) ($validated['email'] ?? '')),
            's_contact' => trim((string) ($validated['contact'] ?? '')),
            's_address' => trim((string) ($validated['address'] ?? '')),
            's_status' => (int) ($validated['status'] ?? 1),
        ]);

        if (array_key_exists('brand_id', $validated) && $validated['brand_id'] !== null) {
            $supplier->s_brand_id = (int) $validated['brand_id'];
        }
        $supplier->save();

        return response()->json([
            'message' => 'Supplier company updated successfully.',
            'supplier' => $this->transform($supplier->fresh()),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $this->normalizeMissingSupplierIds();

        $admin = $this->resolveAdmin($request);
        if (! $admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplierId = (int) $id;
        $supplier = $supplierId > 0 ? Supplier::query()->find($supplierId) : null;
        if (! $supplier) {
            $company = trim((string) $request->input('company', ''));
            $name = trim((string) $request->input('name', ''));

            if ($company !== '' || $name !== '') {
                if ($company !== '') {
                    $supplier = Supplier::query()
                        ->whereRaw('LOWER(TRIM(COALESCE(s_company, \'\'))) = ?', [mb_strtolower($company)])
                        ->orderByDesc('s_id')
                        ->first();
                }

                if (! $supplier && $name !== '') {
                    $supplier = Supplier::query()
                        ->whereRaw('LOWER(TRIM(COALESCE(s_name, \'\'))) = ?', [mb_strtolower($name)])
                        ->orderByDesc('s_id')
                        ->first();
                }

                if (! $supplier && $company !== '' && $name !== '') {
                    $supplier = Supplier::query()
                        ->whereRaw('LOWER(TRIM(COALESCE(s_company, \'\'))) = ?', [mb_strtolower($company)])
                        ->orWhereRaw('LOWER(TRIM(COALESCE(s_name, \'\'))) = ?', [mb_strtolower($name)])
                        ->orderByDesc('s_id')
                        ->first();
                }
            }
        }

        if (! $supplier) {
            return response()->json(['message' => 'Supplier company not found.'], 404);
        }

        $supplierId = (int) $supplier->s_id;

        $deletedSupplierUsers = 0;
        $unassignedProducts = 0;
        $deletedMobileSections = 0;
        $deletedCategoryAccess = 0;

        DB::transaction(function () use (
            $supplier,
            $supplierId,
            &$deletedSupplierUsers,
            &$unassignedProducts,
            &$deletedMobileSections,
            &$deletedCategoryAccess
        ) {
            $deletedCategoryAccess = (int) SupplierCategoryAccess::query()
                ->where('supplier_id', $supplierId)
                ->delete();

            $deletedSupplierUsers = (int) SupplierUser::query()
                ->where('su_supplier', $supplierId)
                ->delete();

            if (Schema::hasTable('tbl_supplier_mobile_home_sections')) {
                $deletedMobileSections = (int) DB::table('tbl_supplier_mobile_home_sections')
                    ->where('smhs_supplier_id', $supplierId)
                    ->delete();
            }

            if (Schema::hasColumn('tbl_product', 'pd_supplier')) {
                $unassignedProducts = (int) Product::query()
                    ->where('pd_supplier', $supplierId)
                    ->update(['pd_supplier' => null]);
            }

            $supplier->delete();
        });

        return response()->json([
            'message' => 'Supplier company deleted successfully.',
            'deleted_supplier_users' => $deletedSupplierUsers,
            'unassigned_products' => $unassignedProducts,
            'deleted_mobile_sections' => $deletedMobileSections,
            'deleted_category_access' => $deletedCategoryAccess,
        ]);
    }

    private function resolveAdmin(Request $request): ?Admin
    {
        $user = $request->user();
        return $user instanceof Admin ? $user : null;
    }

    private function resolveSupplierUser(Request $request): ?SupplierUser
    {
        $user = $request->user();
        return $user instanceof SupplierUser ? $user : null;
    }

    private function roleFromLevel(int $level): string
    {
        return match ($level) {
            1 => 'super_admin',
            2 => 'admin',
            3 => 'csr',
            4 => 'web_content',
            5 => 'accounting',
            6 => 'finance_officer',
            7 => 'merchant_admin',
            8 => 'supplier_admin',
            default => 'staff',
        };
    }

    private function transform(Supplier $supplier): array
    {
        return [
            'id' => (int) $supplier->s_id,
            'name' => (string) ($supplier->s_name ?? ''),
            'company' => (string) ($supplier->s_company ?? ''),
            'email' => (string) ($supplier->s_email ?? ''),
            'contact' => (string) ($supplier->s_contact ?? ''),
            'address' => (string) ($supplier->s_address ?? ''),
            'status' => (int) ($supplier->s_status ?? 0),
            'brand_id' => $supplier->s_brand_id !== null ? (int) $supplier->s_brand_id : null,
            'brand' => $supplier->brand?->pb_name,
            'assigned_categories' => $this->assignedCategories((int) $supplier->s_id),
        ];
    }

    private function normalizeMissingSupplierIds(): void
    {
        $rows = DB::table('tbl_supplier')
            ->selectRaw("ctid::text as row_ctid, s_name, s_company, s_email, s_contact, s_address, s_status")
            ->whereNull('s_id')
            ->orderBy('s_company')
            ->orderBy('s_name')
            ->get();

        if ($rows->isEmpty()) {
            return;
        }

        $nextId = ((int) (DB::table('tbl_supplier')->whereNotNull('s_id')->max('s_id') ?? 0)) + 1;

        foreach ($rows as $row) {
            DB::table('tbl_supplier')
                ->whereRaw('ctid::text = ?', [$row->row_ctid])
                ->update([
                    's_id' => $nextId,
                ]);

            $nextId++;
        }
    }

    private function resolveAccessibleSupplier(int $supplierId, ?Admin $admin, ?SupplierUser $supplierUser): ?Supplier
    {
        $query = Supplier::query()->where('s_id', $supplierId);

        if ($supplierUser) {
            $query->where('s_id', (int) $supplierUser->su_supplier);
        } elseif ($admin && $this->roleFromLevel((int) $admin->user_level_id) === 'supplier_admin') {
            $query->where('s_id', (int) ($admin->supplier_id ?? 0));
        }

        return $query->first();
    }

    private function assignedCategories(int $supplierId): array
    {
        if ($supplierId <= 0) {
            return [];
        }

        return Category::query()
            ->select(['tbl_category.cat_id', 'tbl_category.cat_name', 'tbl_category.cat_url'])
            ->join('tbl_supplier_category_access', 'tbl_supplier_category_access.category_id', '=', 'tbl_category.cat_id')
            ->where('tbl_supplier_category_access.supplier_id', $supplierId)
            ->orderBy('tbl_category.cat_order')
            ->orderBy('tbl_category.cat_name')
            ->get()
            ->map(fn (Category $category) => [
                'id' => (int) $category->cat_id,
                'name' => (string) ($category->cat_name ?? ''),
                'url' => (string) ($category->cat_url ?? ''),
            ])
            ->values()
            ->all();
    }
}
