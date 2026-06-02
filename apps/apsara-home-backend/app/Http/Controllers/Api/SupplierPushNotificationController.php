<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendScheduledPushNotificationJob;
use App\Models\FcmDeviceToken;
use App\Models\SupplierPushNotification;
use App\Models\SupplierUser;
use App\Services\FirebaseMessagingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupplierPushNotificationController extends Controller
{
    public function __construct(private FirebaseMessagingService $firebaseService)
    {
    }

    private function resolveSupplierUser(Request $request): ?SupplierUser
    {
        $user = $request->user();
        return $user instanceof SupplierUser ? $user : null;
    }

    public function send(Request $request)
    {
        $supplierUser = $this->resolveSupplierUser($request);

        if (!$supplierUser) {
            return response()->json(['message' => 'Only suppliers can access this.'], 403);
        }

        $supplierId = (int) $supplierUser->su_supplier;

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string|max:500',
            'image' => 'nullable|string',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'integer|min:1',
            'buttonText' => 'nullable|string|max:255',
            'scheduled_at' => 'nullable|date_format:Y-m-d\TH:i|after:now',
        ]);

        try {
            $title = $validated['title'];
            $body = $validated['body'];
            $rawImage = $validated['image'] ?? null;
            $image = $this->transformCloudinaryImage($rawImage);
            $recipientCustomerIds = $validated['recipients'];
            $scheduledAt = isset($validated['scheduled_at']) ? \Carbon\Carbon::parse($validated['scheduled_at']) : null;

            Log::info('Supplier push notification send initiated', [
                'supplier_id' => $supplierId,
                'recipient_count' => count($recipientCustomerIds),
                'title' => $title,
                'scheduled_at' => $scheduledAt,
                'image_raw' => $rawImage ? substr($rawImage, 0, 80) : 'NONE',
                'image_transformed' => $image ? substr($image, 0, 80) : 'NONE',
            ]);

            // If scheduled, save and dispatch job with delay
            if ($scheduledAt) {
                $notificationRecord = SupplierPushNotification::create([
                    'spn_supplier_id' => $supplierId,
                    'spn_title' => $title,
                    'spn_body' => $body,
                    'spn_image' => $image,
                    'spn_button_text' => $validated['buttonText'] ?? null,
                    'spn_recipients' => $recipientCustomerIds,
                    'spn_sent_count' => 0,
                    'spn_failed_count' => 0,
                    'spn_scheduled_at' => $scheduledAt,
                    'spn_status' => 'scheduled',
                    'spn_created_at' => now(),
                    'spn_updated_at' => now(),
                ]);

                // Dispatch job to queue with delay - will execute automatically at scheduled time
                SendScheduledPushNotificationJob::dispatch($notificationRecord->spn_id)
                    ->delay($scheduledAt);

                Log::info('Supplier push notification scheduled with delayed job', [
                    'notification_id' => $notificationRecord->spn_id,
                    'supplier_id' => $supplierId,
                    'scheduled_for' => $scheduledAt,
                ]);

                return response()->json([
                    'message' => 'Notification scheduled successfully.',
                    'notification_id' => $notificationRecord->spn_id,
                    'scheduled_at' => $scheduledAt,
                    'status' => 'scheduled',
                ], 200);
            }

            // Get FCM tokens for specified customers
            $tokens = FcmDeviceToken::query()
                ->whereIn('fdt_customer_id', $recipientCustomerIds)
                ->where('fdt_is_active', true)
                ->pluck('fdt_fcm_token')
                ->toArray();

            if (empty($tokens)) {
                Log::warning('No active FCM tokens found for specified customers', [
                    'supplier_id' => $supplierId,
                    'customer_ids' => $recipientCustomerIds,
                ]);

                return response()->json([
                    'message' => 'No active devices found for selected customers.',
                    'sent' => 0,
                    'failed' => 0,
                ], 400);
            }

            // Prepare notification payload
            $data = [
                'supplier_id' => (string) $supplierId,
                'href' => '/orders',
            ];

            if (!empty($validated['buttonText'])) {
                $data['buttonText'] = $validated['buttonText'];
            }

            $notification = [
                'title' => $title,
                'body' => $body,
                'image' => $image,
                'data' => $data,
            ];

            // Send notification to all tokens
            $result = $this->firebaseService->sendBatch($tokens, $notification);

            // Save notification record
            $notificationRecord = SupplierPushNotification::create([
                'spn_supplier_id' => $supplierId,
                'spn_title' => $title,
                'spn_body' => $body,
                'spn_image' => $image,
                'spn_button_text' => $validated['buttonText'] ?? null,
                'spn_recipients' => $recipientCustomerIds,
                'spn_sent_count' => $result['sent'],
                'spn_failed_count' => $result['failed'],
                'spn_sent_at' => now(),
                'spn_status' => 'sent',
                'spn_created_at' => now(),
                'spn_updated_at' => now(),
            ]);

            Log::info('Supplier push notification sent successfully', [
                'notification_id' => $notificationRecord->spn_id,
                'supplier_id' => $supplierId,
                'sent' => $result['sent'],
                'failed' => $result['failed'],
            ]);

            return response()->json([
                'message' => 'Notification sent successfully.',
                'notification_id' => $notificationRecord->spn_id,
                'sent' => $result['sent'],
                'failed' => $result['failed'],
                'total_tokens' => count($tokens),
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Error sending supplier push notification', [
                'supplier_id' => $supplierId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to send notification.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getHistory(Request $request)
    {
        $supplierUser = $this->resolveSupplierUser($request);

        if (!$supplierUser) {
            return response()->json(['message' => 'Only suppliers can access this.'], 403);
        }

        $supplierId = (int) $supplierUser->su_supplier;

        $notifications = SupplierPushNotification::query()
            ->where('spn_supplier_id', $supplierId)
            ->orderByDesc('spn_created_at')
            ->paginate(20);

        return response()->json($notifications);
    }

    public function getAvailableCustomers(Request $request)
    {
        $supplierUser = $this->resolveSupplierUser($request);

        if (!$supplierUser) {
            return response()->json(['message' => 'Only suppliers can access this.'], 403);
        }

        $devices = FcmDeviceToken::query()
            ->where('fdt_is_active', true)
            ->orderBy('fdt_customer_id')
            ->orderBy('fdt_device_name')
            ->get(['fdt_customer_id', 'fdt_device_name'])
            ->map(function ($device) {
                return [
                    'customer_id' => (int) $device->fdt_customer_id,
                    'device_name' => $device->fdt_device_name ?? 'Unknown Device',
                ];
            })
            ->toArray();

        $uniqueCustomers = collect($devices)
            ->pluck('customer_id')
            ->unique()
            ->toArray();

        return response()->json([
            'total_customers_with_devices' => count($uniqueCustomers),
            'devices' => $devices,
            'customer_ids' => $uniqueCustomers,
        ]);
    }

    private function transformCloudinaryImage(?string $imageUrl): ?string
    {
        if (!$imageUrl || !str_contains($imageUrl, 'cloudinary.com')) {
            return $imageUrl;
        }

        // Add Cloudinary transformation: rounded corners (r_20) + fill (c_fill) + dimensions
        $transformed = str_replace(
            '/image/upload/',
            '/image/upload/c_fill,w_400,h_300,r_20/',
            $imageUrl
        );

        // Add cache-busting param to force Android to reload without cache
        return $transformed . '?t=' . time();
    }
}
