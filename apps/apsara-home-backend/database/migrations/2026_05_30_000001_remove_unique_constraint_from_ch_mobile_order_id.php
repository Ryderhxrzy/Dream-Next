<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_checkout_history', function (Blueprint $table) {
            // Drop the unique constraint on ch_mobile_order_id
            $table->dropUnique('tbl_checkout_history_ch_mobile_order_id_unique');

            // Keep the index for query performance but not unique
            $table->index('ch_mobile_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_checkout_history', function (Blueprint $table) {
            $table->dropIndex(['ch_mobile_order_id']);
            $table->unique('ch_mobile_order_id');
        });
    }
};
