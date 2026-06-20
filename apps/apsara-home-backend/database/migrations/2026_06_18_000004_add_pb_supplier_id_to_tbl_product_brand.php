<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A merchant (tbl_supplier) owns many brands (e.g. "Xiaomi" owns POCO,
     * Black Shark…). The link lives on the brand: pb_supplier_id -> tbl_supplier.
     *
     * Backfill: assign each in-use brand to its "primary" merchant — the merchant
     * with the most products under that brand. Brands not used by any product
     * stay NULL (unassigned) for manual review.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('tbl_product_brand', 'pb_supplier_id')) {
            Schema::table('tbl_product_brand', function (Blueprint $table) {
                // integer to match tbl_supplier.s_id for the FK; nullable so
                // brands can exist before being assigned to a merchant.
                $table->integer('pb_supplier_id')->nullable()->after('pb_status');
                $table->index('pb_supplier_id', 'tbl_product_brand_pb_supplier_id_idx');
                $table->foreign('pb_supplier_id', 'tbl_product_brand_pb_supplier_id_fk')
                    ->references('s_id')
                    ->on('tbl_supplier')
                    ->nullOnDelete();
            });
        }

        // Backfill primary merchant per brand from existing product data.
        DB::statement(
            'UPDATE tbl_product_brand pb'
            . ' SET pb_supplier_id = sub.supplier'
            . ' FROM ('
            . '   SELECT pd_brand_type AS brand, pd_supplier AS supplier,'
            . '          ROW_NUMBER() OVER ('
            . '            PARTITION BY pd_brand_type ORDER BY COUNT(*) DESC, pd_supplier ASC'
            . '          ) AS rn'
            . '   FROM tbl_product'
            . '   WHERE pd_brand_type IS NOT NULL AND pd_supplier IS NOT NULL AND pd_supplier > 0'
            . '   GROUP BY pd_brand_type, pd_supplier'
            . ' ) sub'
            . ' WHERE pb.pb_id = sub.brand AND sub.rn = 1 AND pb.pb_supplier_id IS NULL'
        );
    }

    public function down(): void
    {
        if (Schema::hasColumn('tbl_product_brand', 'pb_supplier_id')) {
            Schema::table('tbl_product_brand', function (Blueprint $table) {
                $table->dropForeign('tbl_product_brand_pb_supplier_id_fk');
                $table->dropIndex('tbl_product_brand_pb_supplier_id_idx');
                $table->dropColumn('pb_supplier_id');
            });
        }
    }
};
