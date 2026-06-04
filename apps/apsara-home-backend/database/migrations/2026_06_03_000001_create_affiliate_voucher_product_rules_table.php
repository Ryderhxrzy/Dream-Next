<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_affiliate_voucher_product_rules')) {
            return;
        }

        Schema::create('tbl_affiliate_voucher_product_rules', function (Blueprint $table) {
            $table->bigIncrements('avpr_id');
            $table->unsignedBigInteger('avpr_product_id')->unique();
            $table->boolean('avpr_enabled')->default(false);
            $table->decimal('avpr_max_discount', 12, 2)->nullable();
            $table->decimal('avpr_min_spend', 12, 2)->nullable();
            $table->timestamps();

            $table->index('avpr_enabled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_affiliate_voucher_product_rules');
    }
};
