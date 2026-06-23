<?php

namespace App\Services\Checkout;

use App\Mail\Checkout\AbandonedCheckoutReminderMail;
use App\Models\CheckoutHistory;
use App\Models\CustomerNotification;
use App\Services\ExpoPushNotificationService;
use App\Services\FirebaseMessagingService;
use App\Services\SemaphoreService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends abandoned-checkout recovery reminders (email / SMS / push) for a single
 * checkout. Shared by the scheduled SendAbandonedCheckoutReminders command and
 * the manual "Send reminder" admin action.
 */
class AbandonedCheckoutReminderService
{
    /**
     * Remind by checkout id. Loads all line items sharing the id.
     *
     * @param array $opts note?:string, channels?:array, bump_counters?:bool
     */
    public function remindByCheckoutId(string $checkoutId, array $opts = []): array
    {
        $checkoutId = trim($checkoutId);
        if ($checkoutId === '') {
            return $this->result(false, [], 0, false, 'missing_checkout');
        }

        $rows = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->orderBy('ch_id')
            ->get();

        if ($rows->isEmpty()) {
            return $this->result(false, [], 0, false, 'not_found');
        }

        return $this->remindGroup($rows, $opts);
    }

    /**
     * Remind for one already-loaded checkout group (all rows share a checkout).
     *
     * @param Collection<int, CheckoutHistory> $rows
     * @param array $opts note?:string, channels?:array, bump_counters?:bool
     */
    public function remindGroup(Collection $rows, array $opts = []): array
    {
        $rep = $rows->first();
        if (!$rep) {
            return $this->result(false, [], 0, false, 'empty');
        }

        $note = isset($opts['note']) ? trim((string) $opts['note']) : '';
        $note = $note !== '' ? $note : null;
        $bump = (bool) ($opts['bump_counters'] ?? true);

        $configChannels = (array) config('checkout.abandoned.channels', []);
        $channels = [
            'email' => $opts['channels']['email'] ?? ($configChannels['email'] ?? true),
            'sms' => $opts['channels']['sms'] ?? ($configChannels['sms'] ?? true),
            'push' => $opts['channels']['push'] ?? ($configChannels['push'] ?? true),
        ];

        $email = trim((string) ($rep->ch_customer_email ?? ''));
        $phone = trim((string) ($rep->ch_customer_phone ?? ''));
        $customerId = (int) ($rep->ch_customer_id ?? 0);
        $hasEmail = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL);

        $reachable = $hasEmail || $phone !== '' || $customerId > 0;
        if (!$reachable) {
            // Nothing to send to — leave counters untouched for the expiry sweep.
            return $this->result(false, [], (int) ($rep->ch_reminder_count ?? 0), false, 'unreachable');
        }

        $payload = $this->buildPayload($rep, $rows, $note);
        $delivered = [];

        if ($hasEmail && $channels['email'] && $this->sendEmail($email, $payload)) {
            $delivered[] = 'email';
        }
        if ($phone !== '' && $channels['sms'] && $this->sendSms($phone, $payload)) {
            $delivered[] = 'sms';
        }
        if ($customerId > 0 && $channels['push'] && $this->sendPush($customerId, $payload)) {
            $delivered[] = 'push';
        }
        if ($customerId > 0) {
            $this->recordInAppNotification($rep, $payload);
        }

        if ($bump) {
            $this->advanceReminderCounters($rows);
        }

        return $this->result(
            count($delivered) > 0,
            $delivered,
            (int) ($rep->ch_reminder_count ?? 0) + ($bump ? 1 : 0),
            true
        );
    }

    private function result(bool $delivered, array $channels, int $reminderCount, bool $reachable, ?string $reason = null): array
    {
        return [
            'delivered' => $delivered,
            'channels' => $channels,
            'reminder_count' => $reminderCount,
            'reachable' => $reachable,
            'reason' => $reason,
        ];
    }

    /**
     * @param Collection<int, CheckoutHistory> $rows
     */
    private function buildPayload(CheckoutHistory $rep, Collection $rows, ?string $note): array
    {
        $items = $rows->map(fn (CheckoutHistory $row) => [
            'name' => (string) ($row->ch_product_name ?? $row->ch_description ?? 'Order Item'),
            'quantity' => (int) ($row->ch_quantity ?? 1),
            'amount' => (float) ($row->ch_amount ?? 0),
            'image' => $row->ch_product_image ?: null,
        ])->values()->all();

        $total = (float) $rows->sum(fn (CheckoutHistory $row) => (float) ($row->ch_amount ?? 0));
        $shipping = (float) ($rep->ch_shipping_fee ?? 0);

        $base = rtrim((string) config('checkout.frontend_url', ''), '/');
        $resumeUrl = trim((string) ($rep->ch_checkout_url ?? ''));
        if ($resumeUrl === '') {
            $resumeUrl = $base !== '' ? $base . '/orders' : '#';
        }

        return [
            'customer_name' => (string) ($rep->ch_customer_name ?? ''),
            'items' => $items,
            'total' => $total + $shipping,
            'currency' => 'PHP',
            'resume_url' => $resumeUrl,
            'reminder_number' => (int) ($rep->ch_reminder_count ?? 0) + 1,
            'note' => $note,
        ];
    }

    private function sendEmail(string $email, array $payload): bool
    {
        try {
            Mail::to($email)->send(new AbandonedCheckoutReminderMail($payload));
            return true;
        } catch (\Throwable $e) {
            Log::warning('Abandoned checkout reminder email failed.', ['email' => $email, 'error' => $e->getMessage()]);
            return false;
        }
    }

    private function sendSms(string $phone, array $payload): bool
    {
        $name = trim((string) $payload['customer_name']) ?: 'there';
        $note = trim((string) ($payload['note'] ?? ''));
        $message = sprintf(
            'Hi %s, you have an unpaid AF Home order (%s %s).%s Complete your payment here: %s',
            $name,
            $payload['currency'],
            number_format((float) $payload['total'], 2),
            $note !== '' ? ' ' . $note : '',
            $payload['resume_url']
        );

        try {
            return (bool) app(SemaphoreService::class)->sendMessage($phone, $message);
        } catch (\Throwable $e) {
            Log::warning('Abandoned checkout reminder SMS failed.', ['phone' => $phone, 'error' => $e->getMessage()]);
            return false;
        }
    }

    private function sendPush(int $customerId, array $payload): bool
    {
        $notification = [
            'title' => 'Complete your AF Home order',
            'body' => sprintf('Your order (%s %s) is waiting for payment. Tap to finish checking out.', $payload['currency'], number_format((float) $payload['total'], 2)),
            'data' => ['href' => '/orders', 'type' => 'abandoned_checkout'],
        ];

        $sent = 0;
        foreach ([FirebaseMessagingService::class, ExpoPushNotificationService::class] as $service) {
            try {
                $result = app($service)->sendToCustomer($customerId, $notification);
                $sent += (int) ($result['sent'] ?? 0);
            } catch (\Throwable $e) {
                Log::warning('Abandoned checkout reminder push failed.', [
                    'service' => $service,
                    'customer_id' => $customerId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $sent > 0;
    }

    private function recordInAppNotification(CheckoutHistory $rep, array $payload): void
    {
        try {
            CustomerNotification::updateOrCreate(
                [
                    'cn_customer_id' => (int) $rep->ch_customer_id,
                    'cn_source_type' => 'abandoned_checkout',
                    'cn_source_id' => (int) $rep->ch_id,
                ],
                [
                    'cn_type' => 'abandoned_checkout',
                    'cn_severity' => 'warning',
                    'cn_title' => 'Complete your order',
                    'cn_message' => sprintf('You have an unpaid order (%s %s). Tap to finish your payment.', $payload['currency'], number_format((float) $payload['total'], 2)),
                    'cn_href' => '/orders',
                    'cn_payload' => [
                        'checkout_id' => (string) ($rep->ch_checkout_id ?? ''),
                        'resume_url' => $payload['resume_url'],
                        'total' => $payload['total'],
                    ],
                    'cn_created_at' => now(),
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Abandoned checkout in-app notification failed.', [
                'customer_id' => (int) $rep->ch_customer_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param Collection<int, CheckoutHistory> $rows
     */
    private function advanceReminderCounters(Collection $rows): void
    {
        $checkoutId = trim((string) ($rows->first()->ch_checkout_id ?? ''));
        $update = [
            'ch_last_reminder_at' => now(),
            'ch_reminder_count' => DB::raw('COALESCE(ch_reminder_count, 0) + 1'),
        ];

        if ($checkoutId !== '') {
            CheckoutHistory::query()->where('ch_checkout_id', $checkoutId)->update($update);
            return;
        }

        CheckoutHistory::query()->whereIn('ch_id', $rows->pluck('ch_id')->all())->update($update);
    }
}
