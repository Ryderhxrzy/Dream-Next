<?php

namespace App\Console\Commands;

use App\Models\CheckoutHistory;
use App\Services\Payments\PaymongoPaymentSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ExpireAbandonedCheckouts extends Command
{
    protected $signature = 'checkouts:expire-abandoned
        {--limit=200 : Max number of checkouts to evaluate per run}
        {--dry-run : Report what would change without writing}';

    protected $description = 'Mark unpaid checkouts older than the expiry window as terminally abandoned (after a final PayMongo re-check).';

    public function handle(PaymongoPaymentSyncService $syncService): int
    {
        $limit = max(1, min(1000, (int) $this->option('limit')));
        $dryRun = (bool) $this->option('dry-run');
        $hours = (int) config('checkout.abandoned.expire_after_hours', 72);
        $cutoff = now()->subHours($hours);

        // Representative rows (one query, grouped by checkout afterwards) for
        // still-open unpaid checkouts that have aged past the expiry window.
        $candidates = CheckoutHistory::query()
            ->whereNull('ch_paid_at')
            ->whereIn('ch_status', CheckoutHistory::OPEN_UNPAID_STATUSES)
            ->where('created_at', '<=', $cutoff)
            ->orderBy('ch_id')
            ->limit($limit)
            ->get()
            ->groupBy(fn (CheckoutHistory $row) => (string) ($row->ch_checkout_id ?? ''));

        $expired = 0;
        $recovered = 0;
        $skipped = 0;

        foreach ($candidates as $checkoutId => $rows) {
            /** @var CheckoutHistory $rep */
            $rep = $rows->first();

            // Final re-check against PayMongo for web checkout sessions, so a
            // genuinely-paid order whose webhook was missed is never expired.
            if (str_starts_with((string) $checkoutId, 'cs_')) {
                try {
                    $syncService->syncOrder($rep);
                    $rep->refresh();
                } catch (\Throwable $e) {
                    Log::warning('Abandoned-checkout final verify failed; treating as abandoned.', [
                        'checkout_id' => $checkoutId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if ($rep->ch_paid_at !== null || in_array(strtolower((string) $rep->ch_status), ['paid', 'succeeded', 'success'], true)) {
                $recovered++;
                continue;
            }

            if ($dryRun) {
                $this->line(sprintf('[dry-run] would abandon %s (%d item/s)', $checkoutId !== '' ? $checkoutId : '#' . $rep->ch_id, $rows->count()));
                $skipped++;
                continue;
            }

            $query = CheckoutHistory::query()->whereNull('ch_paid_at');
            if ($checkoutId !== '') {
                $query->where('ch_checkout_id', $checkoutId);
            } else {
                $query->whereIn('ch_id', $rows->pluck('ch_id')->all());
            }

            $query->update([
                'ch_status' => CheckoutHistory::STATUS_ABANDONED,
                'ch_abandoned_at' => now(),
            ]);

            $expired++;
        }

        Log::info('Abandoned checkout expiry run complete.', [
            'expired' => $expired,
            'recovered' => $recovered,
            'evaluated' => $candidates->count(),
            'dry_run' => $dryRun,
        ]);

        $this->info(sprintf('Abandoned: %d, recovered: %d, evaluated: %d.', $expired, $recovered, $candidates->count()));

        return self::SUCCESS;
    }
}
