<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\SupplierWarehouse;
use App\Models\SupplierUser;
use App\Services\CloudinaryUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierWarehouseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $supplier = $this->resolveSupplier($request);
        if (! $supplier) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json([
            'warehouses' => $supplier->warehouses()
                ->orderByDesc('sw_id')
                ->get()
                ->map(fn (SupplierWarehouse $warehouse) => $this->transform($warehouse))
                ->values(),
        ]);
    }

    public function store(Request $request, CloudinaryUploadService $cloudinary): JsonResponse
    {
        $supplier = $this->resolveSupplier($request);
        if (! $supplier) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'warehouse_name' => 'required|string|max:255',
            'warehouse_address' => 'required|string|max:1000',
            'image' => 'nullable|image|max:5120',
        ]);

        $imageUrl = '';
        if ($request->hasFile('image')) {
            $upload = $cloudinary->uploadImage($request->file('image'), 'apsara/supplier/warehouses');
            $imageUrl = (string) ($upload['secure_url'] ?? '');
        }

        $warehouse = $supplier->warehouses()->create([
            'sw_name' => trim((string) $validated['warehouse_name']),
            'sw_address' => trim((string) $validated['warehouse_address']),
            'sw_image_url' => $imageUrl !== '' ? $imageUrl : null,
        ]);

        return response()->json([
            'message' => 'Warehouse saved successfully.',
            'warehouse' => $this->transform($warehouse->fresh()),
        ]);
    }

    public function update(Request $request, SupplierWarehouse $warehouse, CloudinaryUploadService $cloudinary): JsonResponse
    {
        $supplier = $this->resolveSupplier($request);
        if (! $supplier) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ((int) $warehouse->sw_supplier_id !== (int) $supplier->s_id) {
            return response()->json(['message' => 'Warehouse not found.'], 404);
        }

        $validated = $request->validate([
            'warehouse_name' => 'required|string|max:255',
            'warehouse_address' => 'required|string|max:1000',
            'image' => 'nullable|image|max:5120',
        ]);

        $imageUrl = trim((string) ($warehouse->sw_image_url ?? ''));
        if ($request->hasFile('image')) {
            $upload = $cloudinary->uploadImage($request->file('image'), 'apsara/supplier/warehouses');
            $imageUrl = (string) ($upload['secure_url'] ?? '');
        }

        $warehouse->forceFill([
            'sw_name' => trim((string) $validated['warehouse_name']),
            'sw_address' => trim((string) $validated['warehouse_address']),
            'sw_image_url' => $imageUrl !== '' ? $imageUrl : null,
        ])->save();

        return response()->json([
            'message' => 'Warehouse updated successfully.',
            'warehouse' => $this->transform($warehouse->fresh()),
        ]);
    }

    public function destroy(Request $request, SupplierWarehouse $warehouse): JsonResponse
    {
        $supplier = $this->resolveSupplier($request);
        if (! $supplier) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ((int) $warehouse->sw_supplier_id !== (int) $supplier->s_id) {
            return response()->json(['message' => 'Warehouse not found.'], 404);
        }

        $warehouse->delete();

        return response()->json([
            'message' => 'Warehouse deleted successfully.',
        ]);
    }

    private function resolveSupplier(Request $request): ?Supplier
    {
        $user = $request->user();
        if (! $user instanceof SupplierUser) {
            return null;
        }

        $user->loadMissing('supplier');
        return $user->supplier;
    }

    private function transform(SupplierWarehouse $warehouse): array
    {
        $address = trim((string) ($warehouse->sw_address ?? ''));
        $searchQuery = $address;

        return [
            'id' => (int) $warehouse->sw_id,
            'supplier_id' => (int) $warehouse->sw_supplier_id,
            'warehouse_name' => (string) ($warehouse->sw_name ?? ''),
            'warehouse_address' => $address,
            'image_url' => (string) ($warehouse->sw_image_url ?? ''),
            'google_maps_url' => $this->buildGoogleMapsUrl($searchQuery),
            'waze_url' => $this->buildWazeUrl($address),
        ];
    }

    private function buildGoogleMapsUrl(string $searchQuery): string
    {
        $normalized = trim($searchQuery);
        if ($normalized === '') {
            return '';
        }

        return 'https://www.google.com/maps/search/?api=1&query=' . urlencode($normalized);
    }

    private function buildWazeUrl(string $address): string
    {
        $normalizedAddress = trim($address);
        if ($normalizedAddress === '') {
            return '';
        }

        return 'https://waze.com/ul?q=' . urlencode($normalizedAddress) . '&navigate=yes';
    }

}
