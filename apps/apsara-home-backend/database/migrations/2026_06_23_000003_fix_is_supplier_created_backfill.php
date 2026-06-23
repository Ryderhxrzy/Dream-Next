<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The previous backfill used cat_order=0 + single-supplier as a heuristic,
        // which incorrectly flagged admin-assigned categories like "Mobile & Accessories".
        // Reset to FALSE for any category that does NOT have a SupplierCategoryAccess
        // row explicitly marked is_supplier_created=TRUE (i.e. only trust the explicit flag,
        // not the heuristic).
        DB::statement("
            UPDATE tbl_category
            SET is_supplier_created = FALSE
            WHERE is_supplier_created = TRUE
              AND NOT EXISTS (
                SELECT 1 FROM tbl_supplier_category_access sca
                WHERE sca.category_id = tbl_category.cat_id
                  AND sca.is_supplier_created = TRUE
              )
        ");
    }

    public function down(): void
    {
        // Not reversible — the original heuristic data is gone.
    }
};
