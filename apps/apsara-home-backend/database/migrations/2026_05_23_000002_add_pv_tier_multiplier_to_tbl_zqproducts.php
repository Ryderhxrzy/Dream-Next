<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_zqproducts', function (Blueprint $table) {
            $table->string('zqp_pv_tier', 20)->nullable()->default('low_end')->after('zqp_pv');
            $table->decimal('zqp_reversed_pv_multiplier', 10, 6)->nullable()->after('zqp_pv_tier');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_zqproducts', function (Blueprint $table) {
            $table->dropColumn(['zqp_pv_tier', 'zqp_reversed_pv_multiplier']);
        });
    }
};
