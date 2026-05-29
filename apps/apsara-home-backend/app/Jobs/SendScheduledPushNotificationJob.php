<?php

namespace App\Jobs;

use App\Models\FcmDeviceToken;
use App\Models\SupplierPushNotification;
use App\Services\FirebaseMessagingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendScheduledPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 120;
    public $tries = 3;
    public $backoff = 10;

    public function __construct(private int $notificationId)
    {
    }

    public function handle(FirebaseMessagingService $firebaseService): void
    {
        $notification = SupplierPushNotification::find($this->notificationId);

        if (!$notification) {
            Log::warning('Scheduled push notification not found', [
                'notification_id' => $this->notificationId,
            ]);
            return;
        }

        try {
            $recipientCustomerIds = $notification->spn_recipients;

            Log::info('Sending scheduled push notification', [
                'notification_id' => $this->notificationId,
                'recipient_count' => count($recipientCustomerIds),
            ]);

            // Get FCM tokens for specified customers
            $tokens = FcmDeviceToken::query()
                ->whereIn('fdt_customer_id', $recipientCustomerIds)
                ->where('fdt_is_active', true)
                ->pluck('fdt_fcm_token')
                ->toArray();

            if (empty($tokens)) {
                Log::warning('No active FCM tokens found for scheduled notification', [
                    'notification_id' => $this->notificationId,
                    'customer_ids' => $recipientCustomerIds,
                ]);

                $notification->update([
                    'spn_status' => 'failed',
                    'spn_sent_count' => 0,
                    'spn_failed_count' => count($recipientCustomerIds),
                    'spn_sent_at' => now(),
                ]);

                return;
            }

            // Prepare notification payload
            $data = [
                'supplier_id' => (string) $notification->spn_supplier_id,
                'href' => '/orders',
            ];

            $notificationPayload = [
                'title' => $notification->spn_title,
                'body' => $notification->spn_body,
                'image' => $notification->spn_image,
                'data' => $data,
            ];

            // Send notification to all tokens
            $result = $firebaseService->sendBatch($tokens, $notificationPayload);

            // Update notification record
            $notification->update([
                'spn_status' => 'sent',
                'spn_sent_count' => $result['sent'],
                'spn_failed_count' => $result['failed'],
                'spn_sent_at' => now(),
            ]);

            Log::info('Scheduled push notification sent successfully', [
                'notification_id' => $this->notificationId,
                'sent' => $result['sent'],
                'failed' => $result['failed'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error sending scheduled push notification', [
                'notification_id' => $this->notificationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        $notification = SupplierPushNotification::find($this->notificationId);

        if ($notification) {
            $notification->update([
                'spn_status' => 'failed',
                'spn_sent_at' => now(),
            ]);

            Log::error('Scheduled push notification job failed permanently', [
                'notification_id' => $this->notificationId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
