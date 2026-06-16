<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_supplier', function (Blueprint $table) {
            $table->string('s_logo', 2048)->nullable()->after('s_address');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_supplier', function (Blueprint $table) {
            $table->dropColumn('s_logo');
        });
    }
};
