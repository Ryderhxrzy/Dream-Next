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
            'schedule_type' => 'nullable|in:once,daily,weekly,monthly',
            'schedule_config' => 'nullable|array',
            'timezone' => 'nullable|string',
        ]);

        try {
            $title = $validated['title'];
            $body = $validated['body'];
            $rawImage = $validated['image'] ?? null;
            $image = $this->transformCloudinaryImage($rawImage);
            $recipientCustomerIds = $validated['recipients'];
            $scheduledAt = isset($validated['scheduled_at']) ? \Carbon\Carbon::parse($validated['scheduled_at']) : null;
            $scheduleType = $validated['schedule_type'] ?? 'once';
            $scheduleConfig = $validated['schedule_config'] ?? null;
            $timezone = $validated['timezone'] ?? 'UTC';

            Log::info('Supplier push notification send initiated', [
                'supplier_id' => $supplierId,
                'recipient_count' => count($recipientCustomerIds),
                'title' => $title,
                'scheduled_at' => $scheduledAt,
                'image_raw' => $rawImage ? substr($rawImage, 0, 80) : 'NONE',
                'image_transformed' => $image ? substr($image, 0, 80) : 'NONE',
            ]);

            // If scheduled (smart scheduling or one-time), save and dispatch job
            if ($scheduleType !== 'once' || $scheduledAt) {
                $nextScheduledAt = $scheduledAt;

                // For recurring schedules, calculate next send time
                if ($scheduleType !== 'once') {
                    $nextScheduledAt = $this->calculateNextScheduledTime($scheduleType, $scheduleConfig, $timezone);
                }

                $notificationRecord = SupplierPushNotification::create([
                    'spn_supplier_id' => $supplierId,
                    'spn_title' => $title,
                    'spn_body' => $body,
                    'spn_image' => $image,
                    'spn_button_text' => $validated['buttonText'] ?? null,
                    'spn_recipients' => $recipientCustomerIds,
                    'spn_sent_count' => 0,
                    'spn_failed_count' => 0,
                    'spn_schedule_type' => $scheduleType,
                    'spn_schedule_config' => $scheduleConfig ? json_encode($scheduleConfig) : null,
                    'spn_timezone' => $timezone,
                    'spn_next_scheduled_at' => $nextScheduledAt,
                    'spn_send_limit' => $scheduleConfig['send_limit'] ?? null,
                    'spn_send_count' => 0,
                    'spn_status' => 'scheduled',
                    'spn_created_at' => now(),
                    'spn_updated_at' => now(),
                ]);

                // Dispatch job to queue with delay
                if ($nextScheduledAt) {
                    SendScheduledPushNotificationJob::dispatch($notificationRecord->spn_id)
                        ->delay($nextScheduledAt);
                }

                Log::info('Supplier push notification scheduled', [
                    'notification_id' => $notificationRecord->spn_id,
                    'supplier_id' => $supplierId,
                    'schedule_type' => $scheduleType,
                    'next_scheduled_for' => $nextScheduledAt,
                    'timezone' => $timezone,
                ]);

                return response()->json([
                    'message' => 'Notification scheduled successfully.',
                    'notification_id' => $notificationRecord->spn_id,
                    'scheduled_at' => $nextScheduledAt,
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
                'spn_schedule_type' => 'once',
                'spn_timezone' => $timezone,
                'spn_sent_at' => now(),
                'spn_status' => 'sent',
                'spn_send_count' => 1,
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

    public function getRecipientsForNotification(Request $request)
    {
        $supplierUser = $this->resolveSupplierUser($request);

        if (!$supplierUser) {
            return response()->json(['message' => 'Only suppliers can access this.'], 403);
        }

        $supplierId = (int) $supplierUser->su_supplier;

        $recipients = \DB::table('tbl_customer')
            ->select(
                'tbl_customer.c_userid',
                \DB::raw("CONCAT(tbl_customer.c_fname, ' ', tbl_customer.c_lname) as c_fullname"),
                \DB::raw('COUNT(DISTINCT tbl_fcm_device_tokens.fdt_id) as device_count'),
                \DB::raw("COUNT(DISTINCT CASE WHEN tbl_product.pd_supplier = {$supplierId} THEN tbl_checkout_history.ch_id END) as purchase_count"),
                \DB::raw("MAX(CASE WHEN tbl_product.pd_supplier = {$supplierId} THEN tbl_checkout_history.created_at END) as last_purchase_date")
            )
            ->join('tbl_fcm_device_tokens', function ($join) {
                $join->on('tbl_customer.c_userid', '=', 'tbl_fcm_device_tokens.fdt_customer_id')
                    ->where('tbl_fcm_device_tokens.fdt_is_active', true);
            })
            ->leftJoin('tbl_checkout_history', function ($join) {
                $join->on('tbl_customer.c_userid', '=', 'tbl_checkout_history.ch_customer_id')
                    ->where('tbl_checkout_history.ch_status', '=', 'paid');
            })
            ->leftJoin('tbl_product', function ($join) use ($supplierId) {
                $join->on('tbl_checkout_history.ch_product_id', '=', 'tbl_product.pd_id');
            })
            ->groupBy('tbl_customer.c_userid', 'tbl_customer.c_fname', 'tbl_customer.c_lname')
            ->orderByDesc('purchase_count')
            ->orderBy('c_fullname')
            ->paginate(50);

        return response()->json($recipients);
    }

    private function calculateNextScheduledTime(string $scheduleType, ?array $config, string $timezone): ?\Carbon\Carbon
    {
        $time = $config['time'] ?? '09:00';
        list($hour, $minute) = explode(':', $time);

        $now = \Carbon\Carbon::now($timezone);
        $next = $now->clone()->setTime((int)$hour, (int)$minute, 0);

        // If scheduled time has passed today, move to next occurrence
        if ($next <= $now) {
            switch ($scheduleType) {
                case 'daily':
                    $interval = $config['interval'] ?? 1;
                    $next->addDays($interval);
                    break;
                case 'weekly':
                    $next->addWeek();
                    break;
                case 'monthly':
                    $day = $config['month_day'] ?? 1;
                    $next->addMonth()->setDay($day);
                    break;
            }
        }

        return $next;
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
