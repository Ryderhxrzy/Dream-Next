<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Banners no longer carry a content-alignment setting — it isn't needed for a
 * plain promotional banner. Drop the column from the existing table.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('tbl_supplier_brand_home_banners', 'sbhb_alignment')) {
            Schema::table('tbl_supplier_brand_home_banners', function (Blueprint $table) {
                $table->dropColumn('sbhb_alignment');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('tbl_supplier_brand_home_banners', 'sbhb_alignment')) {
            Schema::table('tbl_supplier_brand_home_banners', function (Blueprint $table) {
                $table->string('sbhb_alignment', 30)->default('center')->after('sbhb_image_url');
            });
        }
    }
};
