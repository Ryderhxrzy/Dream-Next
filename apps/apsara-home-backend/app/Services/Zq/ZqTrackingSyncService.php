<?php

namespace App\Services\Zq;

use App\Models\AdminNotification;
use App\Models\CheckoutHistory;
use App\Models\CustomerNotification;
use App\Models\Supplier;
use App\Support\DirectReferralCommission;
use App\Support\OrderPvPosting;
use Illuminate\Support\Facades\Log;
use Pusher\Pusher;

class ZqTrackingSyncService
{
    public function __construct(
        private readonly ZqApiService $zqApiService
    ) {
    }

    public function syncPendingOrders(int $limit = 25): array
    {
        $limit = max(1, min(100, $limit));

        if (! $this->zqApiService->isConfigured()) {
            return [
                'processed' => 0,
                'updated' => 0,
                'skipped' => 0,
                'errors' => ['ZQ API is not configured.'],
            ];
        }

        $orders = CheckoutHistory::query()
            ->where('ch_approval_status', 'approved')
            ->whereNotNull('ch_zq_platform_order_id')
            ->where('ch_zq_platform_order_id', '!=', '')
            ->where(function ($query) {
                $query->whereNull('ch_fulfillment_status')
                    ->orWhereNotIn('ch_fulfillment_status', ['delivered', 'cancelled', 'refunded', 'returned', 'returned_refunded']);
            })
            ->orderByRaw('CASE WHEN ch_zq_synced_at IS NULL THEN 0 ELSE 1 END ASC')
            ->orderBy('ch_zq_synced_at')
            ->orderByDesc('ch_id')
            ->limit($limit)
            ->get();

        $summary = [
            'processed' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        foreach ($orders as $order) {
            $summary['processed']++;

            try {
                $result = $this->syncOrder($order);

                if ($result['updated'] ?? false) {
                    $summary['updated']++;
                } else {
                    $summary['skipped']++;
                }
            } catch (\Throwable $e) {
                $summary['errors'][] = sprintf(
                    'Order #%d (%s): %s',
                    (int) $order->ch_id,
                    (string) ($order->ch_checkout_id ?? 'n/a'),
                    $e->getMessage()
                );

                Log::warning('ZQ tracking sync failed for order.', [
                    'order_id' => (int) $order->ch_id,
                    'checkout_id' => (string) ($order->ch_checkout_id ?? ''),
                    'zq_platform_order_id' => (string) ($order->ch_zq_platform_order_id ?? ''),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $summary;
    }

    public function syncOrder(CheckoutHistory $order): array
    {
        $platformOrderId = trim((string) ($order->ch_zq_platform_order_id ?? ''));
        if ($platformOrderId === '') {
            return ['updated' => false, 'tracking_no' => null];
        }

        $now = now('Asia/Manila');
        $previousTrackingNo = trim((string) ($order->ch_tracking_no ?? ''));
        $previousStatus = (string) ($order->ch_fulfillment_status ?? 'pending');
        $detailResponse = $this->zqApiService->getOrderDetail($platformOrderId);
        $trackingResponse = $this->zqApiService->getTracking($platformOrderId);
        $detailData = is_array($detailResponse['data'] ?? null) ? $detailResponse['data'] : [];
        $trackingData = is_array($trackingResponse['data'] ?? null) ? $trackingResponse['data'] : [];

        $state = $this->normalizeStringValue($detailData['state'] ?? $detailData['status'] ?? '');
        $mappedStatus = $this->mapZqStateToLocalStatus($state);
        $trackingNo = $this->normalizeStringValue($trackingData['trackNumber'] ?? $detailData['trackNumber'] ?? '');
        $trackingNoFirstMile = $this->normalizeStringValue($trackingData['trackNumber1'] ?? $detailData['trackNumber1'] ?? '');
        $resolvedTrackingNo = $trackingNo !== '' ? $trackingNo : $trackingNoFirstMile;

        $shipmentPayload = is_array($order->ch_shipment_payload) ? $order->ch_shipment_payload : [];
        $shipmentPayload['zq_detail'] = $detailResponse;
        $shipmentPayload['zq_tracking'] = $trackingResponse;

        $order->fill([
            'ch_zq_platform_order_id' => $this->normalizeStringValue($detailData['platformOrderId'] ?? $trackingData['platformOrderId'] ?? $platformOrderId) ?: $platformOrderId,
            'ch_zq_order_id' => $this->normalizeStringValue($detailData['orderId'] ?? ($order->ch_zq_order_id ?? '')),
            'ch_zq_status' => $state !== '' ? $state : ($order->ch_zq_status ?? null),
            'ch_shipment_payload' => $shipmentPayload,
            'ch_zq_response' => [
                'detail' => $detailResponse,
                'tracking' => $trackingResponse,
            ],
            'ch_zq_synced_at' => $now,
        ]);

        $trackingWasAdded = false;
        $statusChanged = false;

        if ($resolvedTrackingNo !== '') {
            $trackingWasAdded = $previousTrackingNo === '' || $previousTrackingNo !== $resolvedTrackingNo;

            $order->ch_courier = 'zq';
            $order->ch_tracking_no = $resolvedTrackingNo;
            $order->ch_shipment_status = 'in_transit';
            if ($mappedStatus === null && ! in_array((string) ($order->ch_fulfillment_status ?? ''), ['delivered', 'out_for_delivery'], true)) {
                $order->ch_fulfillment_status = 'shipped';
            }
            $order->ch_shipped_at = $order->ch_shipped_at ?: $now;
        } elseif ($trackingNoFirstMile !== '') {
            $order->ch_courier = 'zq';
            $order->ch_tracking_no = $trackingNoFirstMile;
            $order->ch_shipment_status = $order->ch_shipment_status ?: 'for_pickup';
            $order->ch_shipped_at = $order->ch_shipped_at ?: $now;
        }

        if ($mappedStatus !== null && $previousStatus !== $mappedStatus) {
            $statusChanged = true;
            $order->ch_fulfillment_status = $mappedStatus;
            if ($mappedStatus === 'delivered') {
                $order->ch_shipment_status = 'delivered';
                $order->ch_shipped_at = $order->ch_shipped_at ?: $now;
            } elseif (in_array($mappedStatus, ['cancelled', 'refunded'], true)) {
                $order->ch_shipment_status = 'cancelled';
            }
        }

        $order->save();

        if ($trackingWasAdded) {
            $this->createTrackingNotifications($order, $resolvedTrackingNo);
        }

        if ($statusChanged && $mappedStatus !== null) {
            $this->createStatusNotifications($order, $previousStatus, $mappedStatus, $state);
        }

        if ($statusChanged && $mappedStatus === 'delivered') {
            OrderPvPosting::postIfNeeded($order, null);
            DirectReferralCommission::releaseAvailableForOrder($order, null);
        } elseif ($statusChanged && in_array($mappedStatus, ['cancelled', 'refunded'], true)) {
            DirectReferralCommission::cancelPendingForOrder($order, null, 'Order cancelled via ZQ sync.');
        }

        return [
            'updated' => $trackingWasAdded || $statusChanged,
            'tracking_no' => $resolvedTrackingNo !== '' ? $resolvedTrackingNo : null,
            'status' => $mappedStatus,
        ];
    }

    private function mapZqStateToLocalStatus(string $state): ?string
    {
        return match (strtoupper(trim($state))) {
            'UNFULFILLED' => 'processing',
            'PAID', 'PROCESSING' => 'processing',
            'SUCCESS' => 'delivered',
            'CLOSE', 'CLOSED', 'CANCELLED', 'CANCELED' => 'cancelled',
            default => null,
        };
    }

    private function createTrackingNotifications(CheckoutHistory $order, string $trackingNo): void
    {
        $checkoutId = trim((string) ($order->ch_checkout_id ?? ''));
        $customerId = (int) ($order->ch_customer_id ?? 0);
        $createdAt = now('Asia/Manila');

        $adminNotification = AdminNotification::query()->firstOrCreate(
            [
                'an_type' => 'zq_tracking_available',
                'an_source_type' => 'order',
                'an_source_id' => (int) $order->ch_id,
            ],
            [
                'an_severity' => 'info',
                'an_title' => 'ZQ Tracking Ready',
                'an_message' => sprintf(
                    'Tracking number %s is now available for order %s.',
                    $trackingNo,
                    $checkoutId !== '' ? $checkoutId : '#' . (int) $order->ch_id
                ),
                'an_href' => '/admin/orders',
                'an_payload' => [
                    'order_id' => (int) $order->ch_id,
                    'checkout_id' => $checkoutId,
                    'tracking_no' => $trackingNo,
                    'courier' => 'zq',
                ],
                'an_created_at' => $createdAt,
            ]
        );

        if ($adminNotification->wasRecentlyCreated) {
            $this->publishAdminNotification($adminNotification);
            $this->publishSupplierNotification($order, 'ZQ Tracking Ready', sprintf(
                'Tracking number %s is now available for order %s.',
                $trackingNo,
                $checkoutId !== '' ? $checkoutId : '#' . (int) $order->ch_id
            ), 'zq_tracking_available', [
                'tracking_no' => $trackingNo,
            ]);
        }

        if ($customerId > 0) {
            $customerNotification = CustomerNotification::query()->firstOrCreate(
                [
                    'cn_type' => 'order_tracking',
                    'cn_source_type' => 'order',
                    'cn_source_id' => (int) $order->ch_id,
                    'cn_customer_id' => $customerId,
                ],
                [
                    'cn_severity' => 'info',
                    'cn_title' => 'Order Tracking Update',
                    'cn_message' => sprintf(
                        'Your order %s now has tracking number %s.',
                        $checkoutId !== '' ? $checkoutId : '#' . (int) $order->ch_id,
                        $trackingNo
                    ),
                    'cn_href' => '/orders',
                    'cn_payload' => [
                        'order_id' => (int) $order->ch_id,
                        'checkout_id' => $checkoutId,
                        'tracking_no' => $trackingNo,
                        'courier' => 'zq',
                    ],
                    'cn_created_at' => $createdAt,
                ]
            );

            if ($customerNotification->wasRecentlyCreated) {
                $this->publishCustomerNotification($customerNotification);
            }
        }
    }

    private function createStatusNotifications(CheckoutHistory $order, string $previousStatus, string $nextStatus, string $zqState): void
    {
        $checkoutId = trim((string) ($order->ch_checkout_id ?? ''));
        $customerId = (int) ($order->ch_customer_id ?? 0);
        $createdAt = now('Asia/Manila');
        $orderLabel = $checkoutId !== '' ? $checkoutId : '#' . (int) $order->ch_id;
        $severity = in_array($nextStatus, ['cancelled', 'refunded'], true)
            ? 'warning'
            : ($nextStatus === 'delivered' ? 'success' : 'info');
        $statusLabel = str_replace('_', ' ', $nextStatus);
        $zqStateLabel = $zqState !== '' ? strtoupper($zqState) : strtoupper($nextStatus);
        $adminMessage = sprintf(
            'ZQ updated order %s from %s to %s.',
            $orderLabel,
            str_replace('_', ' ', $previousStatus !== '' ? $previousStatus : 'pending'),
            $statusLabel
        );
        $customerMessage = match ($nextStatus) {
            'delivered' => sprintf('Your order %s has been delivered.', $orderLabel),
            'cancelled', 'refunded' => sprintf('Your order %s was closed by Global Supplier.', $orderLabel),
            default => sprintf('Your order %s is now %s.', $orderLabel, $statusLabel),
        };

        $adminNotification = AdminNotification::query()->firstOrCreate(
            [
                'an_type' => 'zq_status_' . $nextStatus,
                'an_source_type' => 'order',
                'an_source_id' => (int) $order->ch_id,
            ],
            [
                'an_severity' => $severity,
                'an_title' => 'ZQ Order Status Updated',
                'an_message' => $adminMessage,
                'an_href' => '/admin/orders',
                'an_payload' => [
                    'order_id' => (int) $order->ch_id,
                    'checkout_id' => $checkoutId,
                    'previous_status' => $previousStatus,
                    'status' => $nextStatus,
                    'zq_status' => $zqStateLabel,
                    'courier' => 'zq',
                ],
                'an_created_at' => $createdAt,
            ]
        );

        if ($adminNotification->wasRecentlyCreated) {
            $this->publishAdminNotification($adminNotification);
            $this->publishSupplierNotification($order, 'ZQ Order Status Updated', $adminMessage, 'zq_status_' . $nextStatus, [
                'previous_status' => $previousStatus,
                'status' => $nextStatus,
                'zq_status' => $zqStateLabel,
            ]);
        }

        if ($customerId > 0) {
            $customerNotification = CustomerNotification::query()->firstOrCreate(
                [
                    'cn_type' => 'zq_status_' . $nextStatus,
                    'cn_source_type' => 'order',
                    'cn_source_id' => (int) $order->ch_id,
                    'cn_customer_id' => $customerId,
                ],
                [
                    'cn_severity' => $severity,
                    'cn_title' => 'Order Status Update',
                    'cn_message' => $customerMessage,
                    'cn_href' => '/orders',
                    'cn_payload' => [
                        'order_id' => (int) $order->ch_id,
                        'checkout_id' => $checkoutId,
                        'previous_status' => $previousStatus,
                        'status' => $nextStatus,
                        'zq_status' => $zqStateLabel,
                        'courier' => 'zq',
                    ],
                    'cn_created_at' => $createdAt,
                ]
            );

            if ($customerNotification->wasRecentlyCreated) {
                $this->publishCustomerNotification($customerNotification);
            }
        }
    }

    private function publishAdminNotification(AdminNotification $notification): void
    {
        $pusher = $this->makePusher();
        if (! $pusher) {
            return;
        }

        try {
            $pusher->trigger('private-admin-orders', 'notification.created', [
                'id' => (int) $notification->an_id,
                'type' => (string) $notification->an_type,
                'title' => (string) $notification->an_title,
                'description' => (string) $notification->an_message,
                'href' => (string) ($notification->an_href ?? '/admin/orders'),
                'severity' => (string) ($notification->an_severity ?? 'info'),
                'created_at' => $this->formatPhTimestamp($notification->an_created_at),
                'payload' => $notification->an_payload,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Failed to publish ZQ admin notification.', [
                'notification_id' => (int) $notification->an_id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function publishCustomerNotification(CustomerNotification $notification): void
    {
        $customerId = (int) ($notification->cn_customer_id ?? 0);
        if ($customerId <= 0) {
            return;
        }

        $pusher = $this->makePusher();
        if (! $pusher) {
            return;
        }

        try {
            $createdAt = $this->formatPhTimestamp($notification->cn_created_at);
            $pusher->trigger('private-customer-' . $customerId, 'notification.created', [
                'id' => 'customer_notification:' . (int) $notification->cn_id,
                'type' => (string) $notification->cn_type,
                'title' => (string) $notification->cn_title,
                'description' => (string) $notification->cn_message,
                'count' => 1,
                'severity' => (string) ($notification->cn_severity ?? 'info'),
                'href' => (string) ($notification->cn_href ?? '/orders'),
                'latest_at' => $createdAt,
                'created_at' => $createdAt,
                'payload' => $notification->cn_payload,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Failed to publish ZQ customer notification.', [
                'customer_id' => $customerId,
                'notification_id' => (int) $notification->cn_id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function publishSupplierNotification(CheckoutHistory $order, string $title, string $description, string $type, array $extraPayload = []): void
    {
        $supplier = $this->resolveGlobalSupplier();
        if (! $supplier) {
            Log::warning('ZQ supplier notification skipped: no global supplier found.', [
                'order_id' => (int) $order->ch_id,
                'checkout_id' => (string) ($order->ch_checkout_id ?? ''),
            ]);
            return;
        }

        $pusher = $this->makePusher();
        if (! $pusher) {
            return;
        }

        $checkoutId = trim((string) ($order->ch_checkout_id ?? ''));
        $createdAt = now('Asia/Manila')->toIso8601String();
        $payload = array_merge([
            'order_id' => (int) $order->ch_id,
            'checkout_id' => $checkoutId,
            'customer_name' => trim((string) ($order->ch_customer_name ?? '')),
            'product_name' => trim((string) ($order->ch_product_name ?? '')),
            'courier' => 'zq',
        ], $extraPayload);

        try {
            $pusher->trigger('private-supplier-' . (int) $supplier->s_id, 'notification.created', [
                'order_id' => (int) $order->ch_id,
                'checkout_id' => $checkoutId,
                'type' => $type,
                'title' => $title,
                'description' => $description,
                'href' => '/supplier/orders',
                'created_at' => $createdAt,
                'payload' => $payload,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Failed to publish ZQ supplier notification.', [
                'supplier_id' => (int) $supplier->s_id,
                'order_id' => (int) $order->ch_id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function resolveGlobalSupplier(): ?Supplier
    {
        return Supplier::query()
            ->get(['s_id', 's_name', 's_company'])
            ->first(function (Supplier $supplier) {
                $candidate = strtolower(preg_replace('/[^a-z0-9]/i', '', trim(
                    ((string) ($supplier->s_company ?? '')) . ' ' . ((string) ($supplier->s_name ?? ''))
                )) ?? '');

                return str_contains($candidate, 'afhomeglobal')
                    || str_contains($candidate, 'globalsupplier')
                    || str_contains($candidate, 'zqsupplier');
            });
    }

    private function makePusher(): ?Pusher
    {
        $appId = (string) config('services.pusher.app_id', '');
        $key = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');

        if ($appId === '' || $key === '' || $secret === '') {
            return null;
        }

        return new Pusher($key, $secret, $appId, [
            'cluster' => (string) config('services.pusher.cluster', 'ap1'),
            'useTLS' => (bool) config('services.pusher.use_tls', true),
        ]);
    }

    private function formatPhTimestamp(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return \Illuminate\Support\Carbon::instance($value)->timezone('Asia/Manila')->toIso8601String();
        }

        if (is_string($value) && trim($value) !== '') {
            return \Illuminate\Support\Carbon::parse($value)->timezone('Asia/Manila')->toIso8601String();
        }

        return now('Asia/Manila')->toIso8601String();
    }

    private function normalizeStringValue(mixed $value): string
    {
        if (is_array($value)) {
            foreach ($value as $item) {
                $normalized = $this->normalizeStringValue($item);
                if ($normalized !== '') {
                    return $normalized;
                }
            }

            return '';
        }

        if ($value === null) {
            return '';
        }

        return trim((string) $value);
    }
}
