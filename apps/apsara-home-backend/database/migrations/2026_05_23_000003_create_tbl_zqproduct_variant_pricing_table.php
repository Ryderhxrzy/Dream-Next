<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_zqproduct_variant_pricing')) {
            return;
        }

        Schema::create('tbl_zqproduct_variant_pricing', function (Blueprint $table) {
            $table->bigIncrements('zvp_id');
            $table->string('zvp_external_id', 50)->index();
            $table->string('zvp_sku_id', 80);
            $table->bigInteger('zvp_dealer_price')->nullable();
            $table->bigInteger('zvp_member_price')->nullable();
            $table->decimal('zvp_pv', 10, 2)->nullable();
            $table->timestamps();

            $table->unique(['zvp_external_id', 'zvp_sku_id'], 'zvp_external_sku_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_zqproduct_variant_pricing');
    }
};
