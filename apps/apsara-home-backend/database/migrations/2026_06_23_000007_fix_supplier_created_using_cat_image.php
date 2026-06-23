<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Migration 6 used a timestamp heuristic that was still unreliable.
        // Reset both tables first.
        DB::statement("UPDATE tbl_category SET is_supplier_created = FALSE WHERE is_supplier_created = TRUE");
        DB::statement("UPDATE tbl_supplier_category_access SET is_supplier_created = FALSE WHERE is_supplier_created = TRUE");

        // Reliable distinguisher:
        // - CategoryController::store (admin) always sets cat_image = '0'
        // - SupplierController::createCategory (supplier) never sets cat_image → it is NULL
        // Combined with cat_order = 0 (hardcoded by createCategory) this is definitive.
        DB::statement("
            UPDATE tbl_category
            SET is_supplier_created = TRUE
            WHERE parent_id IS NULL
              AND cat_order = 0
              AND (cat_image IS NULL OR cat_image = '')
              AND EXISTS (
                SELECT 1 FROM tbl_supplier_category_access sca
                WHERE sca.category_id = tbl_category.cat_id
              )
        ");

        // Sync access table
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
        DB::statement("UPDATE tbl_category SET is_supplier_created = FALSE");
        DB::statement("UPDATE tbl_supplier_category_access SET is_supplier_created = FALSE");
    }
};
