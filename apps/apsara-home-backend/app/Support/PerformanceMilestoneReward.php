<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\CustomerWalletLedger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Performance Value milestone reward.
 *
 * Rule: for every 50,000 PV of combined direct-referral Performance Value, the
 * sponsor earns PHP 5,000 cash credited straight into the cash wallet (and thus
 * immediately available for encashment). Milestones repeat — 100,000 PV = PHP
 * 10,000, 150,000 PV = PHP 15,000, and so on.
 */
class PerformanceMilestoneReward
{
    public const PV_PER_MILESTONE = 50000.0;
    public const CASH_PER_MILESTONE = 5000.0;
    public const SOURCE_TYPE = 'performance_milestone';

    /**
     * Combined direct-referral Performance Value used to evaluate milestones.
     * Mirrors the value shown on the Performance tab.
     */
    public static function directReferralTotalPv(int $sponsorCustomerId): float
    {
        if ($sponsorCustomerId <= 0) {
            return 0.0;
        }

        return (float) Customer::query()
            ->where('c_sponsor', $sponsorCustomerId)
            ->sum('c_gpv');
    }

    /**
     * Number of milestones already paid out to this sponsor.
     */
    public static function creditedMilestones(int $sponsorCustomerId): int
    {
        if ($sponsorCustomerId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return 0;
        }

        return (int) CustomerWalletLedger::query()
            ->where('wl_customer_id', $sponsorCustomerId)
            ->where('wl_wallet_type', 'cash')
            ->where('wl_entry_type', 'credit')
            ->where('wl_source_type', self::SOURCE_TYPE)
            ->count();
    }

    /**
     * Evaluate and auto-credit any newly earned milestones for the sponsor.
     * Idempotent and safe to call repeatedly. Returns the number of new
     * milestones credited on this call.
     */
    public static function evaluate(Customer|int $sponsor, ?int $actorAdminId = null): int
    {
        $sponsorId = $sponsor instanceof Customer
            ? (int) $sponsor->c_userid
            : (int) $sponsor;

        if ($sponsorId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return 0;
        }

        return (int) DB::transaction(function () use ($sponsorId, $actorAdminId) {
            /** @var Customer|null $lockedSponsor */
            $lockedSponsor = Customer::query()
                ->where('c_userid', $sponsorId)
                ->lockForUpdate()
                ->first();

            if (!$lockedSponsor) {
                return 0;
            }

            $totalPv = self::directReferralTotalPv($sponsorId);
            $earnedMilestones = (int) floor($totalPv / self::PV_PER_MILESTONE);
            $alreadyCredited = self::creditedMilestones($sponsorId);

            if ($earnedMilestones <= $alreadyCredited) {
                return 0;
            }

            $newlyCredited = 0;
            for ($milestone = $alreadyCredited + 1; $milestone <= $earnedMilestones; $milestone++) {
                // Idempotency guard: one ledger row per milestone index.
                $exists = CustomerWalletLedger::query()
                    ->where('wl_customer_id', $sponsorId)
                    ->where('wl_wallet_type', 'cash')
                    ->where('wl_entry_type', 'credit')
                    ->where('wl_source_type', self::SOURCE_TYPE)
                    ->where('wl_source_id', $milestone)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $thresholdPv = $milestone * self::PV_PER_MILESTONE;

                $lockedSponsor->c_totalincome = (float) ($lockedSponsor->c_totalincome ?? 0) + self::CASH_PER_MILESTONE;
                $lockedSponsor->save();

                $ledger = CustomerWalletLedger::create([
                    'wl_customer_id' => $sponsorId,
                    'wl_wallet_type' => 'cash',
                    'wl_entry_type' => 'credit',
                    'wl_amount' => self::CASH_PER_MILESTONE,
                    'wl_source_type' => self::SOURCE_TYPE,
                    'wl_source_id' => $milestone,
                    'wl_reference_no' => sprintf('PERF-MS-%d', $milestone),
                    'wl_notes' => sprintf(
                        'Performance milestone reward: %s PV in combined direct-referral Performance Value reached.',
                        number_format($thresholdPv)
                    ),
                    'wl_created_by' => $actorAdminId,
                ]);

                CustomerBonusNotification::notify(
                    $lockedSponsor,
                    'performance_milestone',
                    'Performance milestone reached',
                    sprintf(
                        'You earned PHP %s for reaching %s Performance Value. It is now available for encashment.',
                        number_format(self::CASH_PER_MILESTONE, 2),
                        number_format($thresholdPv)
                    ),
                    self::SOURCE_TYPE,
                    (int) $ledger->wl_id,
                    [
                        'milestone' => $milestone,
                        'threshold_pv' => $thresholdPv,
                        'cash_amount' => self::CASH_PER_MILESTONE,
                        'total_pv' => $totalPv,
                    ]
                );

                $newlyCredited++;
            }

            return $newlyCredited;
        });
    }

    /**
     * Summary block for the wallet/performance API response.
     *
     * @return array<string, float|int>
     */
    public static function summary(int $sponsorCustomerId): array
    {
        $totalPv = self::directReferralTotalPv($sponsorCustomerId);
        $milestonesReached = (int) floor($totalPv / self::PV_PER_MILESTONE);
        $nextMilestonePv = ($milestonesReached + 1) * self::PV_PER_MILESTONE;

        return [
            'pv_per_milestone' => self::PV_PER_MILESTONE,
            'cash_per_milestone' => self::CASH_PER_MILESTONE,
            'milestones_reached' => $milestonesReached,
            'cash_earned' => round($milestonesReached * self::CASH_PER_MILESTONE, 2),
            'next_milestone_pv' => $nextMilestonePv,
            'pv_to_next' => round(max(0, $nextMilestonePv - $totalPv), 2),
        ];
    }
}
