<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Reverses the earlier one-brand-per-merchant link. The relationship is now
     * the other way around: a merchant owns many brands (tbl_product_brand.
     * pb_supplier_id), so the single s_brand_id on tbl_supplier is obsolete.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('tbl_supplier', 's_brand_id')) {
            return;
        }

        Schema::table('tbl_supplier', function (Blueprint $table) {
            $table->dropForeign('tbl_supplier_s_brand_id_fk');
            $table->dropIndex('tbl_supplier_s_brand_id_idx');
            $table->dropColumn('s_brand_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('tbl_supplier', 's_brand_id')) {
            return;
        }

        Schema::table('tbl_supplier', function (Blueprint $table) {
            $table->integer('s_brand_id')->nullable()->after('s_logo');
            $table->index('s_brand_id', 'tbl_supplier_s_brand_id_idx');
            $table->foreign('s_brand_id', 'tbl_supplier_s_brand_id_fk')
                ->references('pb_id')
                ->on('tbl_product_brand')
                ->nullOnDelete();
        });
    }
};
