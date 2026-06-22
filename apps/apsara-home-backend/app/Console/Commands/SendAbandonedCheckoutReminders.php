<?php

namespace App\Console\Commands;

use App\Mail\Checkout\AbandonedCheckoutReminderMail;
use App\Models\CheckoutHistory;
use App\Models\CustomerNotification;
use App\Services\ExpoPushNotificationService;
use App\Services\FirebaseMessagingService;
use App\Services\SemaphoreService;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAbandonedCheckoutReminders extends Command
{
    protected $signature = 'checkouts:send-abandoned-reminders
        {--limit=100 : Max number of checkouts to process per run}
        {--dry-run : List who would be reminded without sending or counting}';

    protected $description = 'Send recovery reminders (email/SMS/push) to customers who started a checkout but never paid.';

    public function handle(): int
    {
        $limit = max(1, min(500, (int) $this->option('limit')));
        $dryRun = (bool) $this->option('dry-run');

        $graceMinutes = (int) config('checkout.abandoned.grace_minutes', 60);
        $expireHours = (int) config('checkout.abandoned.expire_after_hours', 72);
        $maxReminders = (int) config('checkout.abandoned.max_reminders', 2);
        $gapHours = (int) config('checkout.abandoned.reminder_gap_hours', 20);
        $channels = (array) config('checkout.abandoned.channels', []);

        $now = now();

        $query = CheckoutHistory::query()
            ->whereNull('ch_paid_at')
            ->whereIn('ch_status', CheckoutHistory::OPEN_UNPAID_STATUSES)
            ->where('created_at', '<=', $now->copy()->subMinutes($graceMinutes))
            ->where('created_at', '>=', $now->copy()->subHours($expireHours))
            ->where(function ($q) use ($maxReminders) {
                $q->whereNull('ch_reminder_count')->orWhere('ch_reminder_count', '<', $maxReminders);
            })
            ->where(function ($q) use ($now, $gapHours) {
                $q->whereNull('ch_last_reminder_at')
                    ->orWhere('ch_last_reminder_at', '<=', $now->copy()->subHours($gapHours));
            });

        $this->applyOfflineExclusion($query);

        $groups = $query->orderBy('ch_id')
            ->limit($limit)
            ->get()
            ->groupBy(fn (CheckoutHistory $row) => ((string) ($row->ch_checkout_id ?? '')) !== ''
                ? (string) $row->ch_checkout_id
                : 'row:' . $row->ch_id);

        $reminded = 0;
        $skipped = 0;

        foreach ($groups as $key => $rows) {
            /** @var CheckoutHistory $rep */
            $rep = $rows->first();

            $email = trim((string) ($rep->ch_customer_email ?? ''));
            $phone = trim((string) ($rep->ch_customer_phone ?? ''));
            $customerId = (int) ($rep->ch_customer_id ?? 0);

            $hasEmail = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL);
            if (!$hasEmail && $phone === '' && $customerId <= 0) {
                // No reachable channel — leave it for the expiry sweep.
                $skipped++;
                continue;
            }

            $payload = $this->buildPayload($rep, $rows);

            if ($dryRun) {
                $this->line(sprintf(
                    '[dry-run] reminder #%d -> %s (%s) | %s items, %s %s',
                    $payload['reminder_number'],
                    $rep->ch_customer_name ?: 'Customer',
                    $hasEmail ? $email : ($phone !== '' ? $phone : 'customer#' . $customerId),
                    count($payload['items']),
                    $payload['currency'],
                    number_format($payload['total'], 2)
                ));
                continue;
            }

            $delivered = false;

            if ($hasEmail && ($channels['email'] ?? true)) {
                $delivered = $this->sendEmail($email, $payload) || $delivered;
            }

            if ($phone !== '' && ($channels['sms'] ?? true)) {
                $delivered = $this->sendSms($phone, $payload) || $delivered;
            }

            if ($customerId > 0 && ($channels['push'] ?? true)) {
                $delivered = $this->sendPush($customerId, $payload) || $delivered;
                $this->recordInAppNotification($rep, $payload);
            }

            // Always advance the counters once a send was attempted across a
            // reachable channel, so a checkout is never reminded twice in a run.
            $this->advanceReminderCounters($key, $rows, $now);

            if ($delivered) {
                $reminded++;
            } else {
                $skipped++;
            }
        }

        Log::info('Abandoned checkout reminders run complete.', [
            'reminded' => $reminded,
            'skipped' => $skipped,
            'groups' => $groups->count(),
            'dry_run' => $dryRun,
        ]);

        $this->info(sprintf('Reminded: %d, skipped: %d, groups: %d.', $reminded, $skipped, $groups->count()));

        return self::SUCCESS;
    }

    private function applyOfflineExclusion($query): void
    {
        $offline = array_values(array_filter(array_map(
            'strtolower',
            (array) config('checkout.abandoned.offline_payment_methods', [])
        )));

        if (!empty($offline)) {
            $query->whereNotIn(DB::raw('LOWER(ch_payment_method)'), $offline);
        }
    }

    /**
     * @param Collection<int, CheckoutHistory> $rows
     */
    private function buildPayload(CheckoutHistory $rep, Collection $rows): array
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
        $message = sprintf(
            'Hi %s, you have an unpaid AF Home order (%s %s). Complete your payment here: %s',
            $name,
            $payload['currency'],
            number_format((float) $payload['total'], 2),
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
    private function advanceReminderCounters(string $key, Collection $rows, \Illuminate\Support\Carbon $now): void
    {
        $update = ['ch_last_reminder_at' => $now, 'ch_reminder_count' => DB::raw('COALESCE(ch_reminder_count, 0) + 1')];

        if (str_starts_with($key, 'row:')) {
            CheckoutHistory::query()->whereIn('ch_id', $rows->pluck('ch_id')->all())->update($update);
            return;
        }

        CheckoutHistory::query()->where('ch_checkout_id', $key)->whereNull('ch_paid_at')->update($update);
    }
}
