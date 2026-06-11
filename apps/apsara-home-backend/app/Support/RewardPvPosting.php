<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\CustomerWalletLedger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Credits "reward" Performance Value (daily check-in, daily/weekly/monthly
 * missions) into a customer's personal PV.
 *
 * Mirrors how App\Support\OrderPvPosting books purchase PV: it bumps the
 * customer's stored PV total (c_gpv) AND writes a 'pv' wallet-ledger row, so
 * the earned points show up in the customer's Personal PV balance and produce
 * an itemised "performance value log" entry (e.g. "Day 2 daily check-in").
 *
 * Unlike OrderPvPosting, it deliberately does NOT trigger unilevel / group /
 * affiliate bonus evaluation — reward PV should not pay downline commissions.
 * (It still accumulates into c_gpv, which the direct-referral cash milestone
 * sums; gate that out via REWARD_SOURCE_TYPES if you need to exclude it.)
 */
class RewardPvPosting
{
    public const SOURCE_DAILY_CHECKIN   = 'daily_checkin';
    public const SOURCE_DAILY_MISSION   = 'daily_mission';
    public const SOURCE_WEEKLY_MISSION  = 'weekly_mission';
    public const SOURCE_MONTHLY_MISSION = 'monthly_mission';

    /** All reward ledger source types (used to identify reward PV). */
    public const REWARD_SOURCE_TYPES = [
        self::SOURCE_DAILY_CHECKIN,
        self::SOURCE_DAILY_MISSION,
        self::SOURCE_WEEKLY_MISSION,
        self::SOURCE_MONTHLY_MISSION,
    ];

    /**
     * Credit PV to a customer's personal performance value.
     *
     * @return int|null the created wallet-ledger id, or null on no-op.
     */
    public static function credit(
        int $customerId,
        float $amount,
        string $sourceType,
        ?int $sourceId = null,
        ?string $referenceNo = null,
        ?string $note = null
    ): ?int {
        if ($customerId <= 0 || $amount <= 0) {
            return null;
        }

        return DB::transaction(function () use ($customerId, $amount, $sourceType, $sourceId, $referenceNo, $note) {
            /** @var Customer|null $customer */
            $customer = Customer::query()
                ->where('c_userid', $customerId)
                ->lockForUpdate()
                ->first();

            if (!$customer) {
                return null;
            }

            $customer->c_gpv = (float) ($customer->c_gpv ?? 0) + $amount;
            $customer->save();

            if (!Schema::hasTable('tbl_customer_wallet_ledger')) {
                return null;
            }

            $ledger = CustomerWalletLedger::create([
                'wl_customer_id'  => $customerId,
                'wl_wallet_type'  => 'pv',
                'wl_entry_type'   => 'credit',
                'wl_amount'       => round($amount, 2),
                'wl_source_type'  => $sourceType,
                'wl_source_id'    => $sourceId,
                'wl_reference_no' => $referenceNo,
                'wl_notes'        => $note,
                'wl_created_by'   => null,
            ]);

            return (int) $ledger->wl_id;
        });
    }

    /**
     * Total reward PV a customer has earned across all reward sources.
     */
    public static function totalEarned(int $customerId): float
    {
        if ($customerId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return 0.0;
        }

        return (float) CustomerWalletLedger::query()
            ->where('wl_customer_id', $customerId)
            ->where('wl_wallet_type', 'pv')
            ->where('wl_entry_type', 'credit')
            ->whereIn('wl_source_type', self::REWARD_SOURCE_TYPES)
            ->sum('wl_amount');
    }
}
