<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Migration 3 reset tbl_category.is_supplier_created for false-positive rows,
        // but tbl_supplier_category_access still has is_supplier_created = TRUE for those
        // same rows (set by migration 2). This causes getCategories({ supplier_id }) to
        // exclude legitimate admin-assigned categories from the supplier filter.
        // Reset the access rows to match tbl_category.
        DB::statement("
            UPDATE tbl_supplier_category_access
            SET is_supplier_created = FALSE
            FROM tbl_category c
            WHERE tbl_supplier_category_access.category_id = c.cat_id
              AND c.is_supplier_created = FALSE
              AND tbl_supplier_category_access.is_supplier_created = TRUE
        ");
    }

    public function down(): void
    {
        // Not reversible.
    }
};
