<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tbl_zqproduct_variant_pricing')) {
            return;
        }

        Schema::table('tbl_zqproduct_variant_pricing', function (Blueprint $table) {
            if (! Schema::hasColumn('tbl_zqproduct_variant_pricing', 'zvp_reversed_pv_multiplier')) {
                $table->decimal('zvp_reversed_pv_multiplier', 10, 6)->nullable()->after('zvp_pv');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tbl_zqproduct_variant_pricing')) {
            return;
        }

        Schema::table('tbl_zqproduct_variant_pricing', function (Blueprint $table) {
            if (Schema::hasColumn('tbl_zqproduct_variant_pricing', 'zvp_reversed_pv_multiplier')) {
                $table->dropColumn('zvp_reversed_pv_multiplier');
            }
        });
    }
};
