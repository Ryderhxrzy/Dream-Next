<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\CustomerWalletLedger;
use App\Models\CheckoutHistory;
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

        $directIds = Customer::query()
            ->where('c_sponsor', $sponsorCustomerId)
            ->pluck('c_userid');

        if ($directIds->isEmpty()) {
            return 0.0;
        }

        $tz = 'Asia/Manila';
        $monthStart = now($tz)->startOfMonth();
        $monthEnd = now($tz)->endOfMonth();

        return (float) CheckoutHistory::query()
            ->whereIn('ch_customer_id', $directIds)
            ->where('ch_earned_pv', '>', 0)
            ->whereNotNull('ch_pv_posted_at')
            ->whereNotIn('ch_status', ['failed', 'cancelled', 'expired'])
            ->whereBetween('ch_pv_posted_at', [$monthStart->toDateTimeString(), $monthEnd->toDateTimeString()])
            ->sum('ch_earned_pv');
    }

    /**
     * Number of milestones already paid out to this sponsor.
     */
    public static function creditedMilestones(int $sponsorCustomerId): int
    {
        if ($sponsorCustomerId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return 0;
        }

        $tz = 'Asia/Manila';
        $monthStart = now($tz)->startOfMonth();
        $monthEnd = now($tz)->endOfMonth();

        return (int) CustomerWalletLedger::query()
            ->where('wl_customer_id', $sponsorCustomerId)
            ->where('wl_wallet_type', 'cash')
            ->where('wl_entry_type', 'credit')
            ->where('wl_source_type', self::SOURCE_TYPE)
            ->whereBetween('created_at', [$monthStart->toDateTimeString(), $monthEnd->toDateTimeString()])
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

            $activation = MemberMonthlyActivation::summary($lockedSponsor);
            if (($activation['status'] ?? 'inactive') !== 'active') {
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
                    ->whereBetween('created_at', [
                        now('Asia/Manila')->startOfMonth()->toDateTimeString(),
                        now('Asia/Manila')->endOfMonth()->toDateTimeString(),
                    ])
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
     * @return array<string, float|int|bool|null>
     */
    public static function summary(int $sponsorCustomerId): array
    {
        $totalPv = self::directReferralTotalPv($sponsorCustomerId);
        $milestonesReached = (int) floor($totalPv / self::PV_PER_MILESTONE);
        $tranchePv = fmod($totalPv, self::PV_PER_MILESTONE);
        $isExactMilestone = $totalPv > 0
            && $milestonesReached > 0
            && abs($tranchePv) < 0.00001;
        $displayTranchePv = $isExactMilestone ? self::PV_PER_MILESTONE : $tranchePv;
        $pvToNext = $isExactMilestone ? 0.0 : self::PV_PER_MILESTONE - $tranchePv;
        $creditedMilestones = self::creditedMilestones($sponsorCustomerId);

        /** @var Customer|null $sponsor */
        $sponsor = Customer::query()
            ->where('c_userid', $sponsorCustomerId)
            ->first();
        $activation = $sponsor ? MemberMonthlyActivation::summary($sponsor) : null;
        $isQualified = ($activation['status'] ?? 'inactive') === 'active';
        $lockedMilestones = max(0, $milestonesReached - $creditedMilestones);

        return [
            'pv_per_milestone' => self::PV_PER_MILESTONE,
            'cash_per_milestone' => self::CASH_PER_MILESTONE,
            'milestones_reached' => $milestonesReached,
            'credited_milestones' => $creditedMilestones,
            'locked_milestones' => $lockedMilestones,
            'cash_earned' => round($creditedMilestones * self::CASH_PER_MILESTONE, 2),
            'potential_cash_earned' => round($milestonesReached * self::CASH_PER_MILESTONE, 2),
            'next_milestone_pv' => self::PV_PER_MILESTONE,
            'current_cycle_pv' => round($displayTranchePv, 2),
            'pv_to_next' => round(max(0, $pvToNext), 2),
            'is_qualified' => $isQualified,
            'activation_required_pv' => $activation ? (float) ($activation['threshold_pv'] ?? 0) : null,
            'activation_current_pv' => $activation ? (float) ($activation['qualifying_pv'] ?? 0) : null,
            'activation_remaining_pv' => $activation ? (float) ($activation['remaining_pv'] ?? 0) : null,
        ];
    }
}
