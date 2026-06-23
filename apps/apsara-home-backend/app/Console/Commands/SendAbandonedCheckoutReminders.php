<?php

namespace App\Console\Commands;

use App\Models\CheckoutHistory;
use App\Services\Checkout\AbandonedCheckoutReminderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendAbandonedCheckoutReminders extends Command
{
    protected $signature = 'checkouts:send-abandoned-reminders
        {--limit=100 : Max number of checkouts to process per run}
        {--dry-run : List who would be reminded without sending or counting}';

    protected $description = 'Send recovery reminders (email/SMS/push) to customers who started a checkout but never paid.';

    public function handle(AbandonedCheckoutReminderService $service): int
    {
        $limit = max(1, min(500, (int) $this->option('limit')));
        $dryRun = (bool) $this->option('dry-run');

        $graceMinutes = (int) config('checkout.abandoned.grace_minutes', 60);
        $expireHours = (int) config('checkout.abandoned.expire_after_hours', 72);
        $maxReminders = (int) config('checkout.abandoned.max_reminders', 2);
        $gapHours = (int) config('checkout.abandoned.reminder_gap_hours', 20);

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

        foreach ($groups as $rows) {
            $rep = $rows->first();

            if ($dryRun) {
                $this->line(sprintf(
                    '[dry-run] would remind %s (%s) | %d item/s',
                    $rep->ch_customer_name ?: 'Customer',
                    $rep->ch_customer_email ?: ($rep->ch_customer_phone ?: 'customer#' . (int) $rep->ch_customer_id),
                    $rows->count()
                ));
                continue;
            }

            $result = $service->remindGroup($rows);
            if ($result['delivered']) {
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
}
