<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('tbl_supplier', 's_brand_id')) {
            return;
        }

        Schema::table('tbl_supplier', function (Blueprint $table) {
            // integer (not bigint) to match tbl_product_brand.pb_id for the FK.
            // Nullable at the DB level because existing suppliers predate brands;
            // the API requires a brand when creating a NEW merchant.
            $table->integer('s_brand_id')->nullable()->after('s_logo');
            $table->index('s_brand_id', 'tbl_supplier_s_brand_id_idx');
            $table->foreign('s_brand_id', 'tbl_supplier_s_brand_id_fk')
                ->references('pb_id')
                ->on('tbl_product_brand')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tbl_supplier', function (Blueprint $table) {
            $table->dropForeign('tbl_supplier_s_brand_id_fk');
            $table->dropIndex('tbl_supplier_s_brand_id_idx');
            $table->dropColumn('s_brand_id');
        });
    }
};
