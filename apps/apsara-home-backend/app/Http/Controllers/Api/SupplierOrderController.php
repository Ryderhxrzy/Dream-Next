<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutHistory;
use App\Models\OrderNotification;
use App\Models\ProductBrand;
use App\Models\Supplier;
use App\Models\SupplierUser;
use App\Services\Zq\ZqApiService;
use App\Support\DirectReferralCommission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Pusher\Pusher;

class SupplierOrderController extends Controller
{
    public function __construct(private readonly ZqApiService $zqApiService) {}

    public function pusherAuth(Request $request): \Illuminate\Http\JsonResponse
    {
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'socket_id'    => 'required|string|max:100',
            'channel_name' => 'required|string|max:255',
        ]);

        $supplierId      = (int) $supplierUser->su_supplier;
        $channelName     = (string) $validated['channel_name'];
        $expectedChannel = 'private-supplier-' . $supplierId;

        if ($channelName !== $expectedChannel) {
            return response()->json(['message' => 'Forbidden channel.'], 403);
        }

        $key    = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');

        if ($key === '' || $secret === '') {
            return response()->json(['message' => 'Pusher is not configured.'], 503);
        }

        $socketId  = (string) $validated['socket_id'];
        $signature = hash_hmac('sha256', $socketId . ':' . $channelName, $secret);

        return response()->json(['auth' => $key . ':' . $signature]);
    }

    public function notifications(Request $request)
    {
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:20',
        ]);

        $limit = (int) ($validated['limit'] ?? 8);
        $supplierId = (int) $supplierUser->su_supplier;
        $brandTypeValue = $supplierId > 0 ? $this->resolveSupplierBrandType($supplierId) : 0;

        $rows = $this->supplierOrdersBaseQuery($supplierId, $brandTypeValue)
            ->orderByDesc('tbl_checkout_history.ch_paid_at')
            ->orderByDesc('tbl_checkout_history.ch_id')
            ->limit($limit)
            ->get();

        $items = $rows->map(function ($row) {
            $orderId = (int) $row->ch_id;
            $checkoutId = trim((string) ($row->ch_checkout_id ?? ''));
            $productName = trim((string) ($row->ch_product_name ?? 'Order Item'));
            $customerName = trim((string) ($row->ch_customer_name ?? 'Customer'));
            $quantity = (int) ($row->ch_quantity ?? 0);
            $amount = (float) ($row->ch_amount ?? 0);
            $approvalStatus = (string) ($row->ch_approval_status ?? 'pending_approval');
            $fulfillmentStatus = (string) ($row->ch_fulfillment_status ?? 'pending');
            $statusLine = $approvalStatus === 'approved'
                ? 'Ready for supplier fulfillment'
                : 'Waiting for admin approval';

            if (in_array($fulfillmentStatus, ['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'], true)) {
                $statusLine = 'Supplier status: ' . str_replace('_', ' ', $fulfillmentStatus);
            } elseif (in_array($fulfillmentStatus, ['cancelled', 'returned'], true)) {
                $statusLine = 'Supplier status: ' . str_replace('_', ' ', $fulfillmentStatus);
            }

            return [
                'id' => (string) $orderId,
                'title' => $productName !== '' ? $productName : 'Order Item',
                'description' => sprintf(
                    '%s placed order %s for %d item%s (%s). %s.',
                    $customerName !== '' ? $customerName : 'Customer',
                    $checkoutId !== '' ? $checkoutId : '#' . $orderId,
                    max(1, $quantity),
                    max(1, $quantity) === 1 ? '' : 's',
                    'PHP ' . number_format($amount, 2),
                    ucfirst($statusLine)
                ),
                'count' => 1,
                'href' => '/supplier/orders',
                'updated_at' => optional($row->ch_paid_at ?? $row->updated_at ?? $row->created_at)->toDateTimeString(),
                'payload' => [
                    'order_id' => $orderId,
                    'checkout_id' => $checkoutId,
                    'customer_name' => $customerName,
                    'product_name' => $productName,
                    'quantity' => $quantity,
                    'amount' => $amount,
                    'approval_status' => $approvalStatus,
                    'fulfillment_status' => $fulfillmentStatus,
                ],
            ];
        })->values()->all();

        return response()->json([
            'unread_count' => count($items),
            'items' => $items,
            'generated_at' => now()->toDateTimeString(),
        ]);
    }

    public function index(Request $request)
    {
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'filter' => 'nullable|string|max:40',
            'q' => 'nullable|string|max:120',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $filter = $this->normalizeFilter((string) ($validated['filter'] ?? 'all'));
        $search = trim((string) ($validated['q'] ?? ''));
        $perPage = (int) ($validated['per_page'] ?? 20);

        $supplierId = (int) $supplierUser->su_supplier;
        $brandTypeValue = $supplierId > 0 ? $this->resolveSupplierBrandType($supplierId) : 0;

        $query = $this->supplierOrdersBaseQuery($supplierId, $brandTypeValue)
            ->when($search !== '', function ($builder) use ($search) {
                $builder->where(function ($q) use ($search) {
                    $q->where('tbl_checkout_history.ch_checkout_id', 'like', "%{$search}%")
                        ->orWhere('tbl_checkout_history.ch_product_name', 'like', "%{$search}%")
                        ->orWhere('tbl_checkout_history.ch_customer_name', 'like', "%{$search}%")
                        ->orWhere('tbl_checkout_history.ch_customer_email', 'like', "%{$search}%");
                });
            });

        $this->applyFilter($query, $filter);

        $paginated = $query
            ->orderByDesc('tbl_checkout_history.ch_paid_at')
            ->orderByDesc('tbl_checkout_history.ch_id')
            ->paginate($perPage);

        $items = collect($paginated->items())->map(function ($row) {
            return [
                'id' => (int) $row->ch_id,
                'customer_id' => (int) $row->ch_customer_id,
                'checkout_id' => $row->ch_checkout_id,
                'payment_status' => $row->ch_status,
                'approval_status' => $row->ch_approval_status ?? 'pending_approval',
                'approval_notes' => $row->ch_approval_notes,
                'approved_by' => $row->ch_approved_by ? (int) $row->ch_approved_by : null,
                'approved_at' => optional($row->ch_approved_at)->toDateTimeString(),
                'fulfillment_status' => $row->ch_fulfillment_status ?? 'pending',
                'courier' => $row->ch_courier,
                'tracking_no' => $row->ch_tracking_no,
                'shipment_status' => $row->ch_shipment_status,
                'shipped_at' => optional($row->ch_shipped_at)->toDateTimeString(),
                'product_name' => $row->ch_product_name ?? ($row->ch_description ?? 'Order Item'),
                'product_description' => $row->product_description ?? null,
                'product_image' => $row->ch_product_image,
                'quantity' => (int) $row->ch_quantity,
                'amount' => (float) $row->ch_amount,
                'payment_method' => $row->ch_payment_method,
                'customer_name' => $row->ch_customer_name,
                'customer_email' => $row->ch_customer_email,
                'customer_phone' => $row->ch_customer_phone,
                'customer_address' => $row->ch_customer_address,
                'paid_at' => optional($row->ch_paid_at)->toDateTimeString(),
                'zq_platform_order_id' => $row->ch_zq_platform_order_id ?? null,
                'zq_status' => $row->ch_zq_status ?? null,
                'created_at' => optional($row->created_at)->toDateTimeString(),
                'updated_at' => optional($row->updated_at)->toDateTimeString(),
            ];
        })->values();

        return response()->json([
            'orders' => $items,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
            'counts' => $this->counts($supplierId, $brandTypeValue),
        ]);
    }

    public function updateFulfillment(Request $request, int $id)
    {
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'fulfillment_status' => 'required|in:processing,packed,shipped,out_for_delivery,delivered,cancelled,returned',
        ]);

        $order = $this->findScopedOrder($supplierUser, $id);
        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if (($order->ch_approval_status ?? 'pending_approval') !== 'approved') {
            return response()->json(['message' => 'Order must be approved before supplier fulfillment can start.'], 422);
        }

        $status = (string) $validated['fulfillment_status'];

        DB::transaction(function () use ($order, $status) {
            $order->ch_fulfillment_status = $status;

            if ($status === 'shipped') {
                $order->ch_shipment_status = $order->ch_shipment_status ?: 'in_transit';
                $order->ch_shipped_at = $order->ch_shipped_at ?: now();
            } elseif ($status === 'out_for_delivery') {
                $order->ch_shipment_status = 'out_for_delivery';
                $order->ch_shipped_at = $order->ch_shipped_at ?: now();
            } elseif ($status === 'delivered') {
                $order->ch_shipment_status = 'delivered';
                $order->ch_shipped_at = $order->ch_shipped_at ?: now();
            } elseif ($status === 'cancelled') {
                $order->ch_shipment_status = 'cancelled';
            } elseif ($status === 'returned') {
                $order->ch_shipment_status = 'returned_to_sender';
            }

            $payload = is_array($order->ch_shipment_payload) ? $order->ch_shipment_payload : [];
            $payload['supplier_portal'] = array_merge(
                is_array($payload['supplier_portal'] ?? null) ? $payload['supplier_portal'] : [],
                [
                    'last_fulfillment_status' => $status,
                    'updated_at' => now()->toDateTimeString(),
                ]
            );
            $order->ch_shipment_payload = $payload;
            $order->save();

            if ($status === 'delivered') {
                DirectReferralCommission::releaseAvailableForOrder($order, null);
            } elseif (in_array($status, ['cancelled', 'returned'], true)) {
                DirectReferralCommission::cancelPendingForOrder(
                    $order,
                    null,
                    'Direct referral commission cancelled because the supplier marked the order as ' . $status . '.'
                );
            }
        });

        return response()->json([
            'message' => 'Supplier fulfillment status updated successfully.',
            'order' => $this->mapOrder($order->fresh()),
        ]);
    }

    public function updateTracking(Request $request, int $id)
    {
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'courier' => 'required|string|max:80',
            'tracking_no' => 'required|string|max:120',
            'shipment_status' => 'nullable|in:for_pickup,picked_up,in_transit,out_for_delivery,delivered,failed_delivery,cancelled,returned_to_sender',
        ]);

        $order = $this->findScopedOrder($supplierUser, $id);
        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if (($order->ch_approval_status ?? 'pending_approval') !== 'approved') {
            return response()->json(['message' => 'Order must be approved before tracking can be added.'], 422);
        }

        $shipmentStatus = (string) ($validated['shipment_status'] ?? 'in_transit');

        DB::transaction(function () use ($order, $validated, $shipmentStatus) {
            $order->ch_courier = strtolower(trim((string) $validated['courier']));
            $order->ch_tracking_no = trim((string) $validated['tracking_no']);
            $order->ch_shipment_status = $shipmentStatus;
            $order->ch_shipped_at = $order->ch_shipped_at ?: now();

            if (in_array($shipmentStatus, ['for_pickup', 'picked_up', 'in_transit'], true)) {
                $order->ch_fulfillment_status = 'shipped';
            } elseif ($shipmentStatus === 'out_for_delivery') {
                $order->ch_fulfillment_status = 'out_for_delivery';
            } elseif ($shipmentStatus === 'delivered') {
                $order->ch_fulfillment_status = 'delivered';
            } elseif ($shipmentStatus === 'cancelled') {
                $order->ch_fulfillment_status = 'cancelled';
            } elseif ($shipmentStatus === 'returned_to_sender') {
                $order->ch_fulfillment_status = 'returned';
            }

            $payload = is_array($order->ch_shipment_payload) ? $order->ch_shipment_payload : [];
            $payload['supplier_portal'] = array_merge(
                is_array($payload['supplier_portal'] ?? null) ? $payload['supplier_portal'] : [],
                [
                    'courier' => $order->ch_courier,
                    'tracking_no' => $order->ch_tracking_no,
                    'shipment_status' => $order->ch_shipment_status,
                    'updated_at' => now()->toDateTimeString(),
                ]
            );
            $order->ch_shipment_payload = $payload;
            $order->save();

            if ($shipmentStatus === 'delivered') {
                DirectReferralCommission::releaseAvailableForOrder($order, null);
            } elseif (in_array($shipmentStatus, ['failed_delivery', 'cancelled', 'returned_to_sender'], true)) {
                DirectReferralCommission::cancelPendingForOrder(
                    $order,
                    null,
                    'Direct referral commission cancelled because the supplier shipment status became ' . $shipmentStatus . '.'
                );
            }
        });

        return response()->json([
            'message' => 'Tracking details updated successfully.',
            'order' => $this->mapOrder($order->fresh()),
        ]);
    }

    public function approve(Request $request, int $id)
    {
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplierId = (int) $supplierUser->su_supplier;
        if (! $this->isGlobalSupplier($supplierId)) {
            return response()->json(['message' => 'Forbidden: only the global supplier can approve ZQ orders.'], 403);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $order = $this->findScopedOrder($supplierUser, $id);
        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if (($order->ch_approval_status ?? 'pending_approval') === 'approved') {
            return response()->json(['message' => 'Order is already approved.'], 422);
        }

        DB::transaction(function () use ($order, $supplierUser, $validated) {
            $order->fill([
                'ch_approval_status' => 'approved',
                'ch_approval_notes' => $validated['notes'] ?? null,
                'ch_approved_by' => (int) $supplierUser->su_id,
                'ch_approved_at' => now(),
                'ch_fulfillment_status' => $order->ch_fulfillment_status === 'pending' ? 'processing' : $order->ch_fulfillment_status,
            ])->save();
        });

        OrderNotification::updateStatusForCheckout(
            (string) ($order->ch_checkout_id ?? ''),
            (string) ($order->ch_fulfillment_status ?? 'pending')
        );

        return response()->json([
            'message' => 'Order approved successfully.',
            'order' => $this->mapOrder($order->fresh()),
        ]);
    }

    public function pushToZq(Request $request, int $id)
    {
        $supplierUser = $this->resolveSupplierUser($request);
        if (! $supplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplierId = (int) $supplierUser->su_supplier;
        if (! $this->isGlobalSupplier($supplierId)) {
            return response()->json(['message' => 'Forbidden: only the global supplier can push orders to ZQ.'], 403);
        }

        $order = $this->findScopedOrder($supplierUser, $id);
        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if (($order->ch_approval_status ?? 'pending_approval') !== 'approved') {
            return response()->json(['message' => 'Order must be approved before pushing to ZQ.'], 422);
        }

        $response = $this->pushOrderToZq($order);

        return response()->json([
            'message' => 'Order pushed to ZQ successfully.',
            'zq' => $response,
            'order' => $this->mapOrder($order->fresh()),
        ]);
    }

    private function pushOrderToZq(CheckoutHistory $order): array
    {
        $payload = [$this->buildZqOrderPayload($order)];
        $response = $this->zqApiService->createOrder($payload);

        $responseData = is_array($response['data'] ?? null) ? $response['data'] : [];
        $platformOrderIds = $responseData['platformOrderIds'] ?? [];
        $platformOrderId = '';

        if (is_array($platformOrderIds) && ! empty($platformOrderIds[0])) {
            $platformOrderId = trim((string) $platformOrderIds[0]);
        }

        if ($platformOrderId === '') {
            $platformOrderId = (string) ($payload[0]['orderNumber'] ?? $order->ch_checkout_id);
        }

        $order->fill([
            'ch_zq_platform_order_id' => $platformOrderId,
            'ch_zq_status' => $this->mapZqStateToLocalStatus((string) ($responseData['state'] ?? 'submitted')),
            'ch_zq_payload' => $payload[0],
            'ch_zq_response' => $response,
            'ch_zq_synced_at' => now(),
        ])->save();

        return $response;
    }

    private function buildZqOrderPayload(CheckoutHistory $order): array
    {
        $quantity = max(1, (int) ($order->ch_quantity ?? 1));
        $lineAmount = (int) round((((float) ($order->ch_amount ?? 0)) / $quantity) * 100);
        $parsedAddress = $this->parseOrderAddress((string) ($order->ch_customer_address ?? ''));
        $variantLabel = $this->buildZqVariantLabel($order);
        $sku = trim((string) ($order->ch_product_sku ?? '')) !== ''
            ? trim((string) $order->ch_product_sku)
            : ('ORDER-' . (string) $order->ch_id);
        $imageUrl = trim((string) ($order->ch_product_image ?? ''));

        return [
            'orderNumber' => (string) $order->ch_checkout_id,
            'countryCode' => 'PH',
            'city' => $parsedAddress['city'],
            'province' => $parsedAddress['province'],
            'postCode' => $parsedAddress['postCode'],
            'consignee' => (string) ($order->ch_customer_name ?? 'Customer'),
            'addressDetail' => $parsedAddress['addressDetail'],
            'address2' => $parsedAddress['address2'],
            'phone1' => (string) ($order->ch_customer_phone ?? ''),
            'email' => (string) ($order->ch_customer_email ?? ''),
            'amount' => (int) round(((float) ($order->ch_amount ?? 0)) * 100),
            'commodities' => [[
                'sku' => $sku,
                'productName' => (string) ($order->ch_product_name ?: ($order->ch_description ?? 'Order Item')),
                'variant' => $variantLabel,
                'quantity' => $quantity,
                'amount' => max(0, $lineAmount),
                'productImgUrls' => $imageUrl !== '' ? [$imageUrl] : [],
            ]],
        ];
    }

    private function buildZqVariantLabel(CheckoutHistory $order): string
    {
        $parts = array_values(array_filter([
            trim((string) ($order->ch_selected_color ?? '')),
            trim((string) ($order->ch_selected_size ?? '')),
            trim((string) ($order->ch_selected_type ?? '')),
        ], fn ($value) => $value !== ''));

        return ! empty($parts) ? implode(' / ', $parts) : 'Default';
    }

    private function parseOrderAddress(string $address): array
    {
        $parts = array_values(array_filter(array_map(
            fn ($part) => trim($part),
            explode(',', $address)
        ), fn ($part) => $part !== ''));

        $addressDetail = $parts[0] ?? $address;
        $address2 = $parts[1] ?? '';
        $city = $parts[2] ?? ($parts[1] ?? 'Metro Manila');
        $province = $parts[3] ?? ($parts[2] ?? 'Metro Manila');
        $postCodeSource = end($parts) ?: '';
        preg_match('/\b(\d{4,6})\b/', (string) $postCodeSource, $matches);

        return [
            'addressDetail' => $addressDetail !== '' ? $addressDetail : 'Address not provided',
            'address2' => $address2,
            'city' => $city !== '' ? $city : 'Metro Manila',
            'province' => $province !== '' ? $province : 'Metro Manila',
            'postCode' => $matches[1] ?? '0000',
        ];
    }

    private function mapZqStateToLocalStatus(string $state): ?string
    {
        return match (strtoupper(trim($state))) {
            'UNFULFILLED' => 'pending',
            'PAID', 'PROCESSING', 'SUBMITTED' => 'processing',
            'SUCCESS' => 'delivered',
            'CLOSE' => 'cancelled',
            default => null,
        };
    }

    private function resolveSupplierUser(Request $request): ?SupplierUser
    {
        $user = $request->user();
        return $user instanceof SupplierUser ? $user : null;
    }

    private function resolveSupplierBrandType(int $supplierId): int
    {
        if ($supplierId <= 0) {
            return 0;
        }

        $supplier = Supplier::query()->find($supplierId);
        if (! $supplier) {
            return 0;
        }

        $candidates = [
            (string) ($supplier->s_company ?? ''),
            (string) ($supplier->s_name ?? ''),
        ];
        $normalizedCandidates = collect($candidates)
            ->map(fn ($value) => strtolower(preg_replace('/[^a-z0-9]/i', '', trim($value)) ?? ''))
            ->filter(fn ($value) => $value !== '')
            ->values();

        if ($normalizedCandidates->isEmpty()) {
            return 0;
        }

        $brands = ProductBrand::query()->select(['pb_id', 'pb_name'])->get();
        foreach ($brands as $brand) {
            $brandKey = strtolower(preg_replace('/[^a-z0-9]/i', '', (string) ($brand->pb_name ?? '')) ?? '');
            if ($brandKey === '') {
                continue;
            }
            foreach ($normalizedCandidates as $candidate) {
                if ($candidate !== '' && $candidate === $brandKey) {
                    return (int) $brand->pb_id;
                }
            }
        }

        $bestId = 0;
        $bestScore = 0;
        $bestLen = 0;
        foreach ($brands as $brand) {
            $brandKey = strtolower(preg_replace('/[^a-z0-9]/i', '', (string) ($brand->pb_name ?? '')) ?? '');
            if ($brandKey === '' || strlen($brandKey) < 2) {
                continue;
            }

            foreach ($normalizedCandidates as $candidate) {
                if ($candidate === '') {
                    continue;
                }
                $score = 0;
                if ($candidate === $brandKey) {
                    $score = 3;
                } elseif (str_contains($candidate, $brandKey)) {
                    $score = 2;
                } elseif (str_contains($brandKey, $candidate)) {
                    $score = 1;
                }

                if ($score > 0) {
                    $len = strlen($brandKey);
                    if ($score > $bestScore || ($score === $bestScore && $len > $bestLen)) {
                        $bestScore = $score;
                        $bestLen = $len;
                        $bestId = (int) $brand->pb_id;
                    }
                }
            }
        }

        return $bestId;
    }

    private function applyFilter($query, string $filter): void
    {
        if ($filter === 'all' || $filter === '') {
            return;
        }

        if ($filter === 'to_pay') {
            $query->whereIn('tbl_checkout_history.ch_status', ['pending', 'unpaid', 'failed', 'cancelled', 'expired', 'active']);
            return;
        }

        if ($filter === 'to_ship') {
            $query->whereIn('tbl_checkout_history.ch_fulfillment_status', ['processing', 'packed']);
            return;
        }

        if ($filter === 'to_receive') {
            $query->whereIn('tbl_checkout_history.ch_fulfillment_status', ['shipped', 'out_for_delivery']);
            return;
        }

        if ($filter === 'completed') {
            $query->where('tbl_checkout_history.ch_fulfillment_status', 'delivered');
            return;
        }

        if ($filter === 'cancelled') {
            $query->whereIn('tbl_checkout_history.ch_fulfillment_status', ['cancelled', 'refunded']);
            return;
        }

        if ($filter === 'return') {
            $query->whereIn('tbl_checkout_history.ch_fulfillment_status', ['returned_refunded', 'return', 'returned']);
            return;
        }

        $query->where('tbl_checkout_history.ch_fulfillment_status', $filter);
    }

    private function supplierOrdersBaseQuery(int $supplierId, int $brandTypeValue)
    {
        $query = CheckoutHistory::query()
            ->leftJoin('tbl_product as p', 'p.pd_id', '=', 'tbl_checkout_history.ch_product_id')
            ->select([
                'tbl_checkout_history.ch_id',
                'tbl_checkout_history.ch_customer_id',
                'tbl_checkout_history.ch_checkout_id',
                'tbl_checkout_history.ch_status',
                'tbl_checkout_history.ch_approval_status',
                'tbl_checkout_history.ch_approval_notes',
                'tbl_checkout_history.ch_approved_by',
                'tbl_checkout_history.ch_approved_at',
                'tbl_checkout_history.ch_fulfillment_status',
                'tbl_checkout_history.ch_courier',
                'tbl_checkout_history.ch_tracking_no',
                'tbl_checkout_history.ch_shipment_status',
                'tbl_checkout_history.ch_shipment_payload',
                'tbl_checkout_history.ch_shipped_at',
                'tbl_checkout_history.ch_product_name',
                'tbl_checkout_history.ch_product_id',
                'tbl_checkout_history.ch_product_sku',
                'tbl_checkout_history.ch_product_image',
                'tbl_checkout_history.ch_quantity',
                'tbl_checkout_history.ch_amount',
                'tbl_checkout_history.ch_payment_method',
                'tbl_checkout_history.ch_customer_name',
                'tbl_checkout_history.ch_customer_email',
                'tbl_checkout_history.ch_customer_phone',
                'tbl_checkout_history.ch_customer_address',
                'tbl_checkout_history.ch_paid_at',
                'tbl_checkout_history.ch_zq_platform_order_id',
                'tbl_checkout_history.ch_zq_status',
                'tbl_checkout_history.created_at',
                'tbl_checkout_history.updated_at',
                'p.pd_description as product_description',
            ]);

        if ($this->isGlobalSupplier($supplierId)) {
            return $query->where(function ($builder) {
                $builder->where('tbl_checkout_history.ch_courier', 'zq')
                    ->orWhereNotNull('tbl_checkout_history.ch_zq_payload')
                    ->orWhereNotNull('tbl_checkout_history.ch_zq_platform_order_id')
                    ->orWhereNotNull('tbl_checkout_history.ch_zq_order_id')
                    ->orWhereNotNull('tbl_checkout_history.ch_zq_status');
            });
        }

        return $query
            ->whereNotNull('tbl_checkout_history.ch_product_id')
            ->when($brandTypeValue > 0, function ($builder) use ($supplierId, $brandTypeValue) {
                $builder->where(function ($inner) use ($supplierId, $brandTypeValue) {
                    $inner->where('p.pd_supplier', $supplierId)
                        ->orWhere('p.pd_brand_type', $brandTypeValue);
                });
            }, function ($builder) use ($supplierId) {
                $builder->where('p.pd_supplier', $supplierId);
            });
    }

    private function isGlobalSupplier(int $supplierId): bool
    {
        if ($supplierId <= 0) {
            return false;
        }

        $supplier = Supplier::query()->find($supplierId);
        if (! $supplier) {
            return false;
        }

        $candidate = strtolower(preg_replace('/[^a-z0-9]/i', '', trim(
            ((string) ($supplier->s_company ?? '')) . ' ' . ((string) ($supplier->s_name ?? ''))
        )) ?? '');

        return str_contains($candidate, 'afhomeglobal')
            || str_contains($candidate, 'globalsupplier')
            || str_contains($candidate, 'zqsupplier');
    }

    private function findScopedOrder(SupplierUser $supplierUser, int $id): ?CheckoutHistory
    {
        $supplierId = (int) $supplierUser->su_supplier;
        $brandTypeValue = $supplierId > 0 ? $this->resolveSupplierBrandType($supplierId) : 0;

        return $this->supplierOrdersBaseQuery($supplierId, $brandTypeValue)
            ->where('tbl_checkout_history.ch_id', $id)
            ->first();
    }

    private function mapOrder($row): array
    {
        return [
            'id' => (int) $row->ch_id,
            'customer_id' => (int) $row->ch_customer_id,
            'checkout_id' => $row->ch_checkout_id,
            'payment_status' => $row->ch_status,
            'approval_status' => $row->ch_approval_status ?? 'pending_approval',
            'approval_notes' => $row->ch_approval_notes,
            'approved_by' => $row->ch_approved_by ? (int) $row->ch_approved_by : null,
            'approved_at' => optional($row->ch_approved_at)->toDateTimeString(),
            'fulfillment_status' => $row->ch_fulfillment_status ?? 'pending',
            'courier' => $row->ch_courier,
            'tracking_no' => $row->ch_tracking_no,
            'shipment_status' => $row->ch_shipment_status,
            'shipment_payload' => is_array($row->ch_shipment_payload) ? $row->ch_shipment_payload : null,
            'shipped_at' => optional($row->ch_shipped_at)->toDateTimeString(),
            'product_name' => $row->ch_product_name ?? ($row->ch_description ?? 'Order Item'),
            'product_description' => $row->product_description ?? null,
            'product_image' => $row->ch_product_image,
            'quantity' => (int) $row->ch_quantity,
            'amount' => (float) $row->ch_amount,
            'payment_method' => $row->ch_payment_method,
            'customer_name' => $row->ch_customer_name,
            'customer_email' => $row->ch_customer_email,
            'customer_phone' => $row->ch_customer_phone,
            'customer_address' => $row->ch_customer_address,
            'paid_at' => optional($row->ch_paid_at)->toDateTimeString(),
            'zq_platform_order_id' => $row->ch_zq_platform_order_id ?? null,
            'zq_status' => $row->ch_zq_status ?? null,
            'created_at' => optional($row->created_at)->toDateTimeString(),
            'updated_at' => optional($row->updated_at)->toDateTimeString(),
        ];
    }

    private function normalizeFilter(string $filter): string
    {
        $normalized = strtolower(trim($filter));
        $normalized = str_replace([' ', '-'], '_', $normalized);

        return match ($normalized) {
            'topay' => 'to_pay',
            'toship' => 'to_ship',
            'toreceive', 'to_received', 'received' => 'to_receive',
            'return', 'returned', 'returned_refunded' => 'return',
            default => $normalized,
        };
    }

    private function counts(int $supplierId, int $brandTypeValue): array
    {
        $base = $this->supplierOrdersBaseQuery($supplierId, $brandTypeValue);

        return [
            'total' => (int) (clone $base)->count(),
            'to_pay' => (int) (clone $base)->whereIn('tbl_checkout_history.ch_status', ['pending', 'unpaid', 'failed', 'cancelled', 'expired', 'active'])->count(),
            'to_ship' => (int) (clone $base)->whereIn('tbl_checkout_history.ch_fulfillment_status', ['processing', 'packed'])->count(),
            'to_receive' => (int) (clone $base)->whereIn('tbl_checkout_history.ch_fulfillment_status', ['shipped', 'out_for_delivery'])->count(),
            'completed' => (int) (clone $base)->where('tbl_checkout_history.ch_fulfillment_status', 'delivered')->count(),
            'cancelled' => (int) (clone $base)->whereIn('tbl_checkout_history.ch_fulfillment_status', ['cancelled', 'refunded'])->count(),
            'return' => (int) (clone $base)->whereIn('tbl_checkout_history.ch_fulfillment_status', ['returned_refunded', 'return', 'returned'])->count(),
        ];
    }
}
