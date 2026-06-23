<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('tbl_category', 'is_supplier_created')) {
            Schema::table('tbl_category', function (Blueprint $table) {
                $table->boolean('is_supplier_created')->default(false)->after('parent_id');
            });
        }

        // Backfill: mark existing supplier-created categories.
        // A parent category (parent_id IS NULL, cat_order = 0) that only ever appeared
        // in a single supplier's access list is considered supplier-created.
        DB::statement("
            UPDATE tbl_category
            SET is_supplier_created = TRUE
            WHERE parent_id IS NULL
              AND cat_order = 0
              AND EXISTS (
                SELECT 1 FROM tbl_supplier_category_access sca
                WHERE sca.category_id = tbl_category.cat_id
              )
              AND (
                EXISTS (
                    SELECT 1 FROM tbl_supplier_category_access sca
                    WHERE sca.category_id = tbl_category.cat_id
                      AND sca.is_supplier_created = TRUE
                )
                OR (
                    SELECT COUNT(DISTINCT sca.supplier_id)
                    FROM tbl_supplier_category_access sca
                    WHERE sca.category_id = tbl_category.cat_id
                ) = 1
              )
        ");

        // Sync: flag the access rows for these categories too
        DB::statement("
            UPDATE tbl_supplier_category_access
            SET is_supplier_created = TRUE
            FROM tbl_category c
            WHERE tbl_supplier_category_access.category_id = c.cat_id
              AND c.is_supplier_created = TRUE
        ");
    }

    public function down(): void
    {
        if (Schema::hasColumn('tbl_category', 'is_supplier_created')) {
            Schema::table('tbl_category', function (Blueprint $table) {
                $table->dropColumn('is_supplier_created');
            });
        }
    }
};
