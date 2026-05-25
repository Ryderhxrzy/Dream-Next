<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_zqproducts', function (Blueprint $table) {
            $table->bigInteger('zqp_dealer_price')->nullable()->after('zqp_cost_max_cents');
            $table->bigInteger('zqp_member_price')->nullable()->after('zqp_dealer_price');
            $table->decimal('zqp_pv', 10, 2)->nullable()->after('zqp_member_price');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_zqproducts', function (Blueprint $table) {
            $table->dropColumn(['zqp_dealer_price', 'zqp_member_price', 'zqp_pv']);
        });
    }
};
