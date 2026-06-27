<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\BrandRequest;
use App\Models\Product;
use App\Models\ProductBrand;
use App\Models\SupplierUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class BrandRequestController extends Controller
{
    // ───────────────────────── Merchant (supplier portal) ─────────────────────────

    /**
     * The brands this merchant already owns (for the "My Brands" page).
     */
    public function myBrands(Request $request): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $hasImage = Schema::hasColumn('tbl_product_brand', 'pb_image');
        $hasSupplier = Schema::hasColumn('tbl_product_brand', 'pb_supplier_id');
        $columns = ['pb_id', 'pb_name', 'pb_status'];
        if ($hasImage) {
            $columns[] = 'pb_image';
        }

        $brands = ProductBrand::query()
            ->select($columns)
            ->when($hasSupplier, fn ($q) => $q->where('pb_supplier_id', $supplierId))
            ->when(! $hasSupplier, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('pb_name')
            ->get()
            ->map(fn (ProductBrand $b) => [
                'id' => (int) $b->pb_id,
                'name' => (string) $b->pb_name,
                'image' => $hasImage && $b->pb_image ? (string) $b->pb_image : null,
                'status' => (int) $b->pb_status,
            ])
            ->values();

        return response()->json(['brands' => $brands]);
    }

    /**
     * This merchant's own products under one of their brands.
     */
    public function myBrandProducts(Request $request, int $id): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $brand = ProductBrand::query()->find($id);
        if (! $brand) {
            return response()->json(['message' => 'Brand not found.'], 404);
        }

        // A merchant may only view products of a brand they own.
        if (
            Schema::hasColumn('tbl_product_brand', 'pb_supplier_id')
            && (int) $brand->pb_supplier_id !== $supplierId
        ) {
            return response()->json(['message' => 'This brand does not belong to your account.'], 403);
        }

        $search = trim((string) $request->query('q', ''));
        $perPage = min(max((int) $request->query('per_page', 24), 1), 100);

        // Source of truth is the brand link (pd_brand_type = pb_id). Brand ownership
        // is already verified above (pb_supplier_id === supplierId), so every product
        // under this brand belongs to the merchant. We deliberately do NOT also filter
        // by pd_supplier: that column is unreliable on legacy products (often null or a
        // stale/different supplier id), which would hide most — sometimes all — of a
        // brand's catalog. e.g. brand "Affordahome" has 266 products but only 21 carry
        // the matching pd_supplier; "Xiaomi" has 80 with zero matches.
        $paginated = Product::query()
            ->where('pd_brand_type', $id)
            ->when($search !== '', fn ($q) => $q->where('pd_name', 'ilike', '%' . $search . '%'))
            ->orderBy('pd_name')
            ->paginate($perPage);

        $products = collect($paginated->items())->map(fn (Product $p) => [
            'id' => (int) $p->pd_id,
            'name' => (string) ($p->pd_name ?? ''),
            'image' => $p->pd_image ? (string) $p->pd_image : null,
            // `price` kept for backwards-compat; original/member/pv mirror the
            // mobile ItemCard so the builder + preview can show member-price-first.
            'price' => $p->pd_price_srp !== null ? (float) $p->pd_price_srp : null,
            'original_price' => $p->pd_price_srp !== null ? (float) $p->pd_price_srp : null,
            'member_price' => $p->pd_price_member !== null ? (float) $p->pd_price_member : null,
            'pv' => $p->pd_prodpv !== null ? (float) $p->pd_prodpv : null,
            'status' => (int) ($p->pd_status ?? 0),
        ])->values();

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

    /**
     * This merchant's own brand requests (pending / approved / rejected).
     */
    public function index(Request $request): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $requests = BrandRequest::query()
            ->where('br_supplier_id', $supplierId)
            ->orderByDesc('br_id')
            ->get()
            ->map(fn (BrandRequest $r) => $this->transform($r))
            ->values();

        return response()->json(['requests' => $requests]);
    }

    /**
     * Submit a new brand request.
     */
    public function store(Request $request): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:105',
            'image' => 'nullable|string|max:1000',
            'note' => 'nullable|string|max:1000',
        ]);

        $name = trim((string) $validated['name']);

        if (ProductBrand::query()->whereRaw('LOWER(pb_name) = ?', [mb_strtolower($name)])->exists()) {
            return response()->json([
                'message' => 'A brand with this name already exists.',
                'errors' => ['name' => ['A brand with this name already exists.']],
            ], 422);
        }

        $pendingExists = BrandRequest::query()
            ->where('br_supplier_id', $supplierId)
            ->where('br_status', 'pending')
            ->whereRaw('LOWER(br_name) = ?', [mb_strtolower($name)])
            ->exists();
        if ($pendingExists) {
            return response()->json([
                'message' => 'You already have a pending request for this brand name.',
                'errors' => ['name' => ['You already have a pending request for this brand name.']],
            ], 422);
        }

        $req = BrandRequest::query()->create([
            'br_supplier_id' => $supplierId,
            'br_name' => $name,
            'br_image' => $request->filled('image') ? (string) $validated['image'] : null,
            'br_note' => $request->filled('note') ? (string) $validated['note'] : null,
            'br_status' => 'pending',
            'br_seen_by_merchant' => true,
        ]);

        return response()->json([
            'message' => 'Brand request submitted. An admin will review it shortly.',
            'request' => $this->transform($req),
        ], 201);
    }

    /**
     * Mark this merchant's decided requests as seen (clears the portal badge).
     */
    public function markSeen(Request $request): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        BrandRequest::query()
            ->where('br_supplier_id', $supplierId)
            ->whereIn('br_status', ['approved', 'rejected'])
            ->where('br_seen_by_merchant', false)
            ->update(['br_seen_by_merchant' => true]);

        return response()->json(['message' => 'ok']);
    }

    // ───────────────────────────────── Admin ─────────────────────────────────────

    /**
     * Admin queue of all brand requests (filterable by status) + counts.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = BrandRequest::query()
            ->with('supplier:s_id,s_company,s_name')
            ->orderByDesc('br_id');

        if ($status && in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('br_status', $status);
        }

        $requests = $query->get()
            ->map(fn (BrandRequest $r) => $this->transform($r, true))
            ->values();

        return response()->json([
            'requests' => $requests,
            'counts' => [
                'all' => BrandRequest::query()->count(),
                'pending' => BrandRequest::query()->where('br_status', 'pending')->count(),
                'approved' => BrandRequest::query()->where('br_status', 'approved')->count(),
                'rejected' => BrandRequest::query()->where('br_status', 'rejected')->count(),
            ],
        ]);
    }

    /**
     * Approve (auto-creates the merchant-owned brand) or reject a request.
     */
    public function adminDecide(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $req = BrandRequest::query()->find($id);
        if (! $req) {
            return response()->json(['message' => 'Brand request not found.'], 404);
        }
        if ($req->br_status !== 'pending') {
            return response()->json(['message' => 'This request has already been ' . $req->br_status . '.'], 422);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'reason' => 'nullable|string|max:1000',
        ]);

        $reason = $request->filled('reason') ? trim((string) $validated['reason']) : null;
        $adminId = $admin instanceof Admin ? (int) $admin->id : null;

        if ($validated['action'] === 'approve') {
            $name = trim((string) $req->br_name);

            if (ProductBrand::query()->whereRaw('LOWER(pb_name) = ?', [mb_strtolower($name)])->exists()) {
                return response()->json([
                    'message' => 'A brand with this name already exists — reject this request instead.',
                ], 422);
            }

            $hasImage = Schema::hasColumn('tbl_product_brand', 'pb_image');
            $hasSupplier = Schema::hasColumn('tbl_product_brand', 'pb_supplier_id');

            $payload = ['pb_name' => $name, 'pb_status' => 0];
            if ($hasImage) {
                $payload['pb_image'] = $req->br_image ?: null;
            }
            if ($hasSupplier) {
                $payload['pb_supplier_id'] = (int) $req->br_supplier_id;
            }

            $brand = ProductBrand::query()->create($payload);

            $req->fill([
                'br_status' => 'approved',
                'br_admin_reason' => $reason,
                'br_created_brand_id' => (int) $brand->pb_id,
                'br_handled_by' => $adminId,
                'br_seen_by_merchant' => false,
                'br_decided_at' => now(),
            ]);
            $req->save();

            return response()->json([
                'message' => 'Brand approved and created for the merchant.',
                'request' => $this->transform($req->fresh(), true),
            ]);
        }

        $req->fill([
            'br_status' => 'rejected',
            'br_admin_reason' => $reason,
            'br_handled_by' => $adminId,
            'br_seen_by_merchant' => false,
            'br_decided_at' => now(),
        ]);
        $req->save();

        return response()->json([
            'message' => 'Brand request rejected.',
            'request' => $this->transform($req->fresh(), true),
        ]);
    }

    // ──────────────────────────────── helpers ────────────────────────────────────

    private function actingSupplierId(Request $request): ?int
    {
        $user = $request->user();
        if ($user instanceof SupplierUser) {
            return (int) $user->su_supplier ?: null;
        }

        return null;
    }

    private function transform(BrandRequest $r, bool $withMerchant = false): array
    {
        $out = [
            'id' => (int) $r->br_id,
            'name' => (string) $r->br_name,
            'image' => $r->br_image ? (string) $r->br_image : null,
            'note' => $r->br_note ? (string) $r->br_note : null,
            'status' => (string) $r->br_status,
            'reason' => $r->br_admin_reason ? (string) $r->br_admin_reason : null,
            'created_brand_id' => $r->br_created_brand_id ? (int) $r->br_created_brand_id : null,
            'seen' => (bool) $r->br_seen_by_merchant,
            'created_at' => optional($r->created_at)->toIso8601String(),
            'decided_at' => optional($r->br_decided_at)->toIso8601String(),
        ];

        if ($withMerchant) {
            $merchant = $r->supplier;
            $out['supplier_id'] = (int) $r->br_supplier_id;
            $out['supplier_name'] = $merchant ? (string) ($merchant->s_company ?: $merchant->s_name) : null;
        }

        return $out;
    }
}
