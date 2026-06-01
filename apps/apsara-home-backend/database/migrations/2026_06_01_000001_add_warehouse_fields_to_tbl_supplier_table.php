<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_supplier', function (Blueprint $table): void {
            if (! Schema::hasColumn('tbl_supplier', 's_warehouse_name')) {
                $table->string('s_warehouse_name', 255)->nullable()->after('s_address');
            }

            if (! Schema::hasColumn('tbl_supplier', 's_warehouse_address')) {
                $table->text('s_warehouse_address')->nullable()->after('s_warehouse_name');
            }

            if (! Schema::hasColumn('tbl_supplier', 's_warehouse_latitude')) {
                $table->decimal('s_warehouse_latitude', 10, 7)->nullable()->after('s_warehouse_address');
            }

            if (! Schema::hasColumn('tbl_supplier', 's_warehouse_longitude')) {
                $table->decimal('s_warehouse_longitude', 10, 7)->nullable()->after('s_warehouse_latitude');
            }

            if (! Schema::hasColumn('tbl_supplier', 's_warehouse_image_url')) {
                $table->text('s_warehouse_image_url')->nullable()->after('s_warehouse_longitude');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbl_supplier', function (Blueprint $table): void {
            if (Schema::hasColumn('tbl_supplier', 's_warehouse_image_url')) {
                $table->dropColumn('s_warehouse_image_url');
            }

            if (Schema::hasColumn('tbl_supplier', 's_warehouse_longitude')) {
                $table->dropColumn('s_warehouse_longitude');
            }

            if (Schema::hasColumn('tbl_supplier', 's_warehouse_latitude')) {
                $table->dropColumn('s_warehouse_latitude');
            }

            if (Schema::hasColumn('tbl_supplier', 's_warehouse_address')) {
                $table->dropColumn('s_warehouse_address');
            }

            if (Schema::hasColumn('tbl_supplier', 's_warehouse_name')) {
                $table->dropColumn('s_warehouse_name');
            }
        });
    }
};
