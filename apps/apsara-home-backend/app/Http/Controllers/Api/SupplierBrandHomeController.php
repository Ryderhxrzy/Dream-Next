<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductBrand;
use App\Models\SupplierBrandHomeBanner;
use App\Models\SupplierBrandHomeCarouselItem;
use App\Models\SupplierBrandHomeProductSection;
use App\Models\SupplierBrandHomeSection;
use App\Models\SupplierBrandHomeSectionProduct;
use App\Models\SupplierUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierBrandHomeController extends Controller
{
    /**
     * All sections (banner / carousel / products) configured for one of the
     * merchant's brands, in display order, with their nested content.
     */
    public function index(Request $request, int $brandId): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->ownsBrand($supplierId, $brandId)) {
            return response()->json(['message' => 'This brand does not belong to your account.'], 403);
        }

        $sections = SupplierBrandHomeSection::query()
            ->with(['banner', 'carouselItems', 'productSection.products.product'])
            ->where('sbhs_supplier_id', $supplierId)
            ->where('sbhs_brand_id', $brandId)
            ->orderBy('sbhs_order')
            ->orderBy('sbhs_id')
            ->get()
            ->map(fn (SupplierBrandHomeSection $s) => $this->transformSection($s))
            ->values();

        return response()->json(['sections' => $sections]);
    }

    /**
     * Create a new section. The payload shape depends on `type`.
     */
    public function store(Request $request, int $brandId): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->ownsBrand($supplierId, $brandId)) {
            return response()->json(['message' => 'This brand does not belong to your account.'], 403);
        }

        $validated = $request->validate([
            'type' => 'required|in:banner,carousel,products',
        ]);
        $type = $validated['type'];

        // Next order = append to the end.
        $nextOrder = (int) SupplierBrandHomeSection::query()
            ->where('sbhs_supplier_id', $supplierId)
            ->where('sbhs_brand_id', $brandId)
            ->max('sbhs_order');
        $nextOrder = $nextOrder + 1;

        $section = DB::transaction(function () use ($request, $supplierId, $brandId, $type, $nextOrder) {
            $section = SupplierBrandHomeSection::query()->create([
                'sbhs_supplier_id' => $supplierId,
                'sbhs_brand_id' => $brandId,
                'sbhs_type' => $type,
                'sbhs_order' => $nextOrder,
                'sbhs_is_active' => true,
            ]);

            $this->writeContent($request, $section, $supplierId, $brandId, $type);

            return $section;
        });

        $section->load(['banner', 'carouselItems', 'productSection.products.product']);

        return response()->json([
            'message' => 'Section added.',
            'section' => $this->transformSection($section),
        ], 201);
    }

    /**
     * Replace the content of an existing section (same type).
     */
    public function update(Request $request, int $sectionId): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $section = SupplierBrandHomeSection::query()->find($sectionId);
        if (! $section || (int) $section->sbhs_supplier_id !== $supplierId) {
            return response()->json(['message' => 'Section not found.'], 404);
        }

        if ($request->has('is_active')) {
            $section->sbhs_is_active = (bool) $request->boolean('is_active');
            $section->save();
        }

        DB::transaction(function () use ($request, $section, $supplierId) {
            // Wipe existing content, then re-write from payload.
            SupplierBrandHomeBanner::query()->where('sbhb_section_id', $section->sbhs_id)->delete();
            SupplierBrandHomeCarouselItem::query()->where('sbhci_section_id', $section->sbhs_id)->delete();
            SupplierBrandHomeProductSection::query()->where('sbhps_section_id', $section->sbhs_id)->delete();

            $this->writeContent($request, $section, $supplierId, (int) $section->sbhs_brand_id, $section->sbhs_type);
        });

        $section->load(['banner', 'carouselItems', 'productSection.products.product']);

        return response()->json([
            'message' => 'Section updated.',
            'section' => $this->transformSection($section),
        ]);
    }

    /**
     * Delete a section (cascades to its content).
     */
    public function destroy(Request $request, int $sectionId): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $section = SupplierBrandHomeSection::query()->find($sectionId);
        if (! $section || (int) $section->sbhs_supplier_id !== $supplierId) {
            return response()->json(['message' => 'Section not found.'], 404);
        }

        $section->delete();

        return response()->json(['message' => 'Section removed.']);
    }

    /**
     * Reorder sections for a brand. Expects `order` = array of section IDs in
     * the desired order.
     */
    public function reorder(Request $request, int $brandId): JsonResponse
    {
        $supplierId = $this->actingSupplierId($request);
        if (! $supplierId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->ownsBrand($supplierId, $brandId)) {
            return response()->json(['message' => 'This brand does not belong to your account.'], 403);
        }

        $validated = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer',
        ]);

        DB::transaction(function () use ($validated, $supplierId, $brandId) {
            foreach ($validated['order'] as $index => $sectionId) {
                SupplierBrandHomeSection::query()
                    ->where('sbhs_id', $sectionId)
                    ->where('sbhs_supplier_id', $supplierId)
                    ->where('sbhs_brand_id', $brandId)
                    ->update(['sbhs_order' => $index + 1]);
            }
        });

        return response()->json(['message' => 'Order saved.']);
    }

    // ──────────────────────────────── helpers ────────────────────────────────────

    /**
     * Write the type-specific content rows for a section from the request payload.
     */
    private function writeContent(Request $request, SupplierBrandHomeSection $section, int $supplierId, int $brandId, string $type): void
    {
        if ($type === 'banner') {
            $data = $request->validate([
                'image_url' => 'required|string|max:2000',
                'link_type' => 'nullable|string|max:50',
                'link_target' => 'nullable|string|max:500',
            ]);

            SupplierBrandHomeBanner::query()->create([
                'sbhb_section_id' => $section->sbhs_id,
                'sbhb_image_url' => $data['image_url'],
                'sbhb_link_type' => $data['link_type'] ?? null,
                'sbhb_link_target' => $data['link_target'] ?? null,
            ]);

            return;
        }

        if ($type === 'carousel') {
            $data = $request->validate([
                'items' => 'required|array|min:1',
                'items.*.image_url' => 'required|string|max:2000',
                'items.*.link_type' => 'nullable|string|max:50',
                'items.*.link_target' => 'nullable|string|max:500',
            ]);

            foreach ($data['items'] as $index => $item) {
                SupplierBrandHomeCarouselItem::query()->create([
                    'sbhci_section_id' => $section->sbhs_id,
                    'sbhci_image_url' => $item['image_url'],
                    'sbhci_order' => $index + 1,
                    'sbhci_link_type' => $item['link_type'] ?? null,
                    'sbhci_link_target' => $item['link_target'] ?? null,
                ]);
            }

            return;
        }

        // products
        $data = $request->validate([
            'label' => 'required|string|max:255',
            'button_text' => 'nullable|string|max:100',
            'button_link' => 'nullable|string|max:500',
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'integer',
        ]);

        $productSection = SupplierBrandHomeProductSection::query()->create([
            'sbhps_section_id' => $section->sbhs_id,
            'sbhps_label' => $data['label'],
            'sbhps_button_text' => $data['button_text'] ?? null,
            'sbhps_button_link' => $data['button_link'] ?? null,
        ]);

        // Only allow products this merchant owns under this brand. Preserve the
        // submitted order, and skip duplicates / foreign products.
        $ownedIds = Product::query()
            ->where('pd_supplier', $supplierId)
            ->where('pd_brand_type', $brandId)
            ->whereIn('pd_id', $data['product_ids'])
            ->pluck('pd_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $ownedSet = array_flip($ownedIds);

        $order = 0;
        $seen = [];
        foreach ($data['product_ids'] as $pid) {
            $pid = (int) $pid;
            if (! isset($ownedSet[$pid]) || isset($seen[$pid])) {
                continue;
            }
            $seen[$pid] = true;
            $order++;
            SupplierBrandHomeSectionProduct::query()->create([
                'sbhsp_product_section_id' => $productSection->sbhps_id,
                'sbhsp_product_id' => $pid,
                'sbhsp_order' => $order,
            ]);
        }
    }

    private function transformSection(SupplierBrandHomeSection $s): array
    {
        $base = [
            'id' => (int) $s->sbhs_id,
            'type' => (string) $s->sbhs_type,
            'order' => (int) $s->sbhs_order,
            'is_active' => (bool) $s->sbhs_is_active,
        ];

        if ($s->sbhs_type === 'banner' && $s->banner) {
            $base['banner'] = [
                'image_url' => (string) $s->banner->sbhb_image_url,
                'link_type' => $s->banner->sbhb_link_type ? (string) $s->banner->sbhb_link_type : null,
                'link_target' => $s->banner->sbhb_link_target ? (string) $s->banner->sbhb_link_target : null,
            ];
        }

        if ($s->sbhs_type === 'carousel') {
            $base['items'] = $s->carouselItems->map(fn (SupplierBrandHomeCarouselItem $c) => [
                'id' => (int) $c->sbhci_id,
                'image_url' => (string) $c->sbhci_image_url,
                'order' => (int) $c->sbhci_order,
                'link_type' => $c->sbhci_link_type ? (string) $c->sbhci_link_type : null,
                'link_target' => $c->sbhci_link_target ? (string) $c->sbhci_link_target : null,
            ])->values();
        }

        if ($s->sbhs_type === 'products' && $s->productSection) {
            $ps = $s->productSection;
            $base['product_section'] = [
                'label' => (string) $ps->sbhps_label,
                'button_text' => $ps->sbhps_button_text ? (string) $ps->sbhps_button_text : null,
                'button_link' => $ps->sbhps_button_link ? (string) $ps->sbhps_button_link : null,
                'products' => $ps->products->map(function (SupplierBrandHomeSectionProduct $sp) {
                    $p = $sp->product;

                    return [
                        'id' => (int) $sp->sbhsp_product_id,
                        'order' => (int) $sp->sbhsp_order,
                        'name' => $p ? (string) ($p->pd_name ?? '') : '',
                        'image' => $p && $p->pd_image ? (string) $p->pd_image : null,
                        'price' => $p && $p->pd_price_srp !== null ? (float) $p->pd_price_srp : null,
                    ];
                })->values(),
            ];
        }

        return $base;
    }

    private function ownsBrand(int $supplierId, int $brandId): bool
    {
        return ProductBrand::query()
            ->where('pb_id', $brandId)
            ->where('pb_supplier_id', $supplierId)
            ->exists();
    }

    private function actingSupplierId(Request $request): ?int
    {
        $user = $request->user();
        if ($user instanceof SupplierUser) {
            return (int) $user->su_supplier ?: null;
        }

        return null;
    }
}
