<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_supplier_user') && ! Schema::hasColumn('tbl_supplier_user', 'su_avatar')) {
            Schema::table('tbl_supplier_user', function (Blueprint $table) {
                $table->string('su_avatar', 2048)->nullable()->after('su_email');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tbl_supplier_user') && Schema::hasColumn('tbl_supplier_user', 'su_avatar')) {
            Schema::table('tbl_supplier_user', function (Blueprint $table) {
                $table->dropColumn('su_avatar');
            });
        }
    }
};
