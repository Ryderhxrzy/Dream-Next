<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Migrations 2-4 left both tables in a partially-corrupt state due to
        // an unreliable heuristic. Reset both to FALSE for ALL existing records.
        // Going forward, only categories created via SupplierController::createCategory
        // (after today) will have is_supplier_created = TRUE.
        DB::statement("UPDATE tbl_category SET is_supplier_created = FALSE WHERE is_supplier_created = TRUE");
        DB::statement("UPDATE tbl_supplier_category_access SET is_supplier_created = FALSE WHERE is_supplier_created = TRUE");
    }

    public function down(): void
    {
        // Not reversible.
    }
};
