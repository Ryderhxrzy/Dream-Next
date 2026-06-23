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
            $this->upsertCustomer([
                'c_fname' => 'Affiliate',
                'c_lname' => 'Hub',
                'c_username' => 'affiliatehub',
                'c_email' => 'affiliate.hub@example.test',
                'c_mobile' => '09000000001',
                'c_sponsor' => $this->emptySponsorValue(),
                'c_partner_slug' => 'affiliatehub',
            ]);
        });

        $this->command?->info('Affiliate Hub account is ready.');
        $this->command?->line('Password: ' . self::PASSWORD);
        $this->command?->line('Account: affiliatehub (no sponsor)');
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
