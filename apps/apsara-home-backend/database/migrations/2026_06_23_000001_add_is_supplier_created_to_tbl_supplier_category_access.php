<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('tbl_supplier_category_access', 'is_supplier_created')) {
            Schema::table('tbl_supplier_category_access', function (Blueprint $table) {
                $table->boolean('is_supplier_created')->default(false)->after('category_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('tbl_supplier_category_access', 'is_supplier_created')) {
            Schema::table('tbl_supplier_category_access', function (Blueprint $table) {
                $table->dropColumn('is_supplier_created');
            });
        }
    }
};
