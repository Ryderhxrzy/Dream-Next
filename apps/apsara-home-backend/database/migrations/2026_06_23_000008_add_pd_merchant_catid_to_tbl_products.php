<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_product', function (Blueprint $table) {
            $table->unsignedBigInteger('pd_merchant_catid')->nullable()->default(null)->after('pd_catsubid');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_product', function (Blueprint $table) {
            $table->dropColumn('pd_merchant_catid');
        });
    }
};
