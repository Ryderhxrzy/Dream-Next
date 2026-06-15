<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AutomationCheckoutAccountSeeder extends Seeder
{
    private const PASSWORD = 'Automation@123';

    public function run(): void
    {
        if (! Schema::hasTable('tbl_customer')) {
            $this->command?->warn('tbl_customer does not exist. Run migrations first.');

            return;
        }

        DB::transaction(function (): void {
            $upline = $this->upsertCustomer([
                'c_fname' => 'Automation',
                'c_lname' => 'Upline',
                'c_username' => 'autoupline',
                'c_email' => 'automation.upline@example.test',
                'c_mobile' => '09000000001',
                'c_sponsor' => $this->emptySponsorValue(),
                'c_partner_slug' => 'autoupline',
            ]);

            $this->upsertCustomer([
                'c_fname' => 'Automation',
                'c_lname' => 'Direct One',
                'c_username' => 'autodirect1',
                'c_email' => 'automation.direct1@example.test',
                'c_mobile' => '09000000002',
                'c_sponsor' => (int) $upline->c_userid,
                'c_partner_slug' => 'autodirect1',
            ]);

            $this->upsertCustomer([
                'c_fname' => 'Automation',
                'c_lname' => 'Direct Two',
                'c_username' => 'autodirect2',
                'c_email' => 'automation.direct2@example.test',
                'c_mobile' => '09000000003',
                'c_sponsor' => (int) $upline->c_userid,
                'c_partner_slug' => 'autodirect2',
            ]);
        });

        $this->command?->info('Automation checkout accounts are ready.');
        $this->command?->line('Password for all accounts: ' . self::PASSWORD);
        $this->command?->line('Upline: autoupline (no sponsor)');
        $this->command?->line('Directs: autodirect1, autodirect2');
    }

    private function upsertCustomer(array $attributes): Customer
    {
        $username = (string) $attributes['c_username'];
        $customer = Customer::query()->where('c_username', $username)->first();

        $payload = [
            'c_fname' => $attributes['c_fname'],
            'c_lname' => $attributes['c_lname'],
            'c_mname' => null,
            'c_email' => $attributes['c_email'],
            'c_mobile' => $attributes['c_mobile'],
            'c_bdate' => '1990-01-01',
            'c_gender' => 0,
            'c_occupation' => 'Automation Tester',
            'c_country' => 'Philippines',
            'c_password' => Hash::make(self::PASSWORD),
            'c_password_pin' => '',
            'c_password_change_required' => false,
            'c_rank' => 0,
            'c_accnt_status' => 1,
            'c_lockstatus' => 0,
            'c_sponsor' => $attributes['c_sponsor'],
            'c_date_started' => now(),
            'c_address' => 'Automation Checkout Address',
            'c_barangay' => 'Automation Barangay',
            'c_city' => 'Makati City',
            'c_province' => 'Metro Manila',
            'c_region' => 'National Capital Region',
            'c_zipcode' => '1200',
        ];

        if (Schema::hasColumn('tbl_customer', 'c_partner_slug')) {
            $payload['c_partner_slug'] = $attributes['c_partner_slug'];
        }

        if (! $customer) {
            $payload['c_userid'] = $this->nextCustomerId();
            $payload['c_username'] = $username;

            return Customer::query()->create($payload);
        }

        $customer->forceFill($payload)->save();

        return $customer->refresh();
    }

    private function nextCustomerId(): int
    {
        return ((int) DB::table('tbl_customer')->whereNotNull('c_userid')->max('c_userid')) + 1;
    }

    private function emptySponsorValue(): ?int
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $isNullable = DB::table('information_schema.columns')
                ->where('table_name', 'tbl_customer')
                ->where('column_name', 'c_sponsor')
                ->value('is_nullable');

            return $isNullable === 'YES' ? null : 0;
        }

        if ($driver === 'mysql') {
            $schema = DB::getDatabaseName();
            $isNullable = DB::table('information_schema.columns')
                ->where('table_schema', $schema)
                ->where('table_name', 'tbl_customer')
                ->where('column_name', 'c_sponsor')
                ->value('is_nullable');

            return $isNullable === 'YES' ? null : 0;
        }

        return null;
    }
}
