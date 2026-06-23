<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Identify supplier-created categories from before the is_supplier_created column existed.
        //
        // When an admin assigns categories via syncCategories, all selected categories get
        // the SAME created_at timestamp (written in a loop at now()). When a supplier creates
        // a category via createCategory, only ONE access record is created at that moment.
        //
        // So: if a SupplierCategoryAccess row has a created_at that is NOT shared with any
        // other row for the same supplier, it was created individually (supplier-created).
        DB::statement("
            UPDATE tbl_supplier_category_access
            SET is_supplier_created = TRUE
            WHERE created_at IS NOT NULL
              AND is_supplier_created = FALSE
              AND NOT EXISTS (
                SELECT 1
                FROM tbl_supplier_category_access other
                WHERE other.supplier_id = tbl_supplier_category_access.supplier_id
                  AND other.category_id != tbl_supplier_category_access.category_id
                  AND other.created_at = tbl_supplier_category_access.created_at
              )
        ");

        // Sync tbl_category to match
        DB::statement("
            UPDATE tbl_category
            SET is_supplier_created = TRUE
            WHERE cat_id IN (
                SELECT category_id
                FROM tbl_supplier_category_access
                WHERE is_supplier_created = TRUE
            )
        ");
    }

    public function down(): void
    {
        DB::statement("UPDATE tbl_category SET is_supplier_created = FALSE");
        DB::statement("UPDATE tbl_supplier_category_access SET is_supplier_created = FALSE");
    }
};
