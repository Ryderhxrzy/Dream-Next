<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\CustomerWalletLedger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ProfileCompletionReward
{
    public const SOURCE_TYPE = 'profile_completion_reward';
    public const E_VOUCHER_REWARD = 50.0;
    public const PV_REWARD = 20.0;

    public static function creditIfEligible(?Customer $customer): bool
    {
        if (!$customer instanceof Customer || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return false;
        }

        return (bool) DB::transaction(function () use ($customer) {
            /** @var Customer|null $lockedCustomer */
            $lockedCustomer = Customer::query()
                ->where('c_userid', (int) $customer->c_userid)
                ->lockForUpdate()
                ->first();

            if (!$lockedCustomer || !self::isComplete($lockedCustomer)) {
                return false;
            }

            $customerId = (int) $lockedCustomer->c_userid;
            $referenceNo = 'PROFILE-COMPLETE-' . $customerId;
            $awarded = false;

            if (!self::hasLedgerCredit($customerId, 'voucher') && self::E_VOUCHER_REWARD > 0) {
                if (Schema::hasColumn('tbl_customer', 'c_WP')) {
                    $lockedCustomer->c_WP = (float) ($lockedCustomer->c_WP ?? 0) + self::E_VOUCHER_REWARD;
                } elseif (Schema::hasColumn('tbl_customer', 'c_wp')) {
                    $lockedCustomer->c_wp = (float) ($lockedCustomer->c_wp ?? 0) + self::E_VOUCHER_REWARD;
                }

                CustomerWalletLedger::create([
                    'wl_customer_id' => $customerId,
                    'wl_wallet_type' => 'voucher',
                    'wl_entry_type' => 'credit',
                    'wl_amount' => self::E_VOUCHER_REWARD,
                    'wl_source_type' => self::SOURCE_TYPE,
                    'wl_source_id' => $customerId,
                    'wl_reference_no' => $referenceNo,
                    'wl_notes' => 'One-time E-Voucher reward for completing the member profile.',
                    'wl_created_by' => null,
                ]);

                $awarded = true;
            }

            if (!self::hasLedgerCredit($customerId, 'pv') && self::PV_REWARD > 0) {
                $lockedCustomer->c_gpv = (float) ($lockedCustomer->c_gpv ?? 0) + self::PV_REWARD;

                CustomerWalletLedger::create([
                    'wl_customer_id' => $customerId,
                    'wl_wallet_type' => 'pv',
                    'wl_entry_type' => 'credit',
                    'wl_amount' => self::PV_REWARD,
                    'wl_source_type' => self::SOURCE_TYPE,
                    'wl_source_id' => $customerId,
                    'wl_reference_no' => $referenceNo,
                    'wl_notes' => 'One-time PV reward for completing the member profile.',
                    'wl_created_by' => null,
                ]);

                $awarded = true;
            }

            if ($lockedCustomer->isDirty()) {
                $lockedCustomer->save();
            }

            if ($awarded) {
                try {
                    MemberActivityLogger::logWalletTransaction(
                        $customerId,
                        'profile_completion',
                        'credit',
                        self::E_VOUCHER_REWARD + self::PV_REWARD,
                        self::SOURCE_TYPE,
                        $customerId
                    );
                } catch (\Throwable $e) {
                    Log::warning('Failed to log profile completion reward activity.', [
                        'customer_id' => $customerId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $awarded;
        });
    }

    public static function voucherLedgerBalance(Customer|int $customer): float
    {
        $customerId = $customer instanceof Customer ? (int) $customer->c_userid : (int) $customer;
        if ($customerId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return 0.0;
        }

        $credits = (float) CustomerWalletLedger::query()
            ->where('wl_customer_id', $customerId)
            ->where('wl_wallet_type', 'voucher')
            ->where('wl_entry_type', 'credit')
            ->sum('wl_amount');
        $debits = (float) CustomerWalletLedger::query()
            ->where('wl_customer_id', $customerId)
            ->where('wl_wallet_type', 'voucher')
            ->where('wl_entry_type', 'debit')
            ->sum('wl_amount');

        return max(0, $credits - $debits);
    }

    private static function hasLedgerCredit(int $customerId, string $walletType): bool
    {
        return CustomerWalletLedger::query()
            ->where('wl_customer_id', $customerId)
            ->where('wl_wallet_type', $walletType)
            ->where('wl_entry_type', 'credit')
            ->where('wl_source_type', self::SOURCE_TYPE)
            ->where('wl_source_id', $customerId)
            ->exists();
    }

    private static function isComplete(Customer $customer): bool
    {
        $country = trim((string) ($customer->c_country ?? ''));
        $occupation = trim((string) ($customer->c_occupation ?? ''));
        $phone = trim((string) ($customer->c_mobile ?? ''));

        $checks = [
            trim((string) ($customer->c_avatar_url ?? '')) !== '',
            trim(self::fullName($customer)) !== '',
            trim((string) ($customer->c_email ?? '')) !== '',
            $phone !== '' && $phone !== '0',
            trim((string) ($customer->c_username ?? '')) !== '',
            self::formatNullableDate($customer->c_bdate ?? null) !== null,
            self::mapIntToGender((int) ($customer->c_gender ?? 0)) !== null,
            $occupation !== '' && strcasecmp($occupation, 'none') !== 0,
            self::inferWorkLocation($country) !== null,
            $country !== '',
            trim((string) ($customer->c_address ?? '')) !== '',
            trim((string) ($customer->c_barangay ?? '')) !== '',
            trim((string) ($customer->c_city ?? '')) !== '',
            trim((string) ($customer->c_province ?? '')) !== '',
            trim((string) ($customer->c_region ?? '')) !== '',
            trim((string) ($customer->c_zipcode ?? '')) !== '',
        ];

        return count(array_filter($checks)) === count($checks);
    }

    private static function fullName(Customer $customer): string
    {
        return trim(implode(' ', array_filter([
            trim((string) ($customer->c_fname ?? '')),
            trim((string) ($customer->c_mname ?? '')),
            trim((string) ($customer->c_lname ?? '')),
        ])));
    }

    private static function formatNullableDate(mixed $value): ?string
    {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '' || $raw === '0000-00-00') {
            return null;
        }

        return $raw;
    }

    private static function mapIntToGender(int $value): ?string
    {
        return match ($value) {
            1 => 'male',
            2 => 'female',
            3 => 'other',
            default => null,
        };
    }

    private static function inferWorkLocation(?string $country): ?string
    {
        $value = trim((string) ($country ?? ''));
        if ($value === '') {
            return null;
        }

        if (
            strcasecmp($value, 'philippines') === 0
            || strtoupper($value) === 'PH'
            || $value === '175'
            || strcasecmp($value, 'local') === 0
        ) {
            return 'local';
        }

        return 'overseas';
    }
}
