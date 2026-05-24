<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_checkout_history') && !Schema::hasColumn('tbl_checkout_history', 'ch_payment_id')) {
            Schema::table('tbl_checkout_history', function (Blueprint $table) {
                $table->string('ch_payment_id', 120)->nullable()->after('ch_payment_intent_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tbl_checkout_history') && Schema::hasColumn('tbl_checkout_history', 'ch_payment_id')) {
            Schema::table('tbl_checkout_history', function (Blueprint $table) {
                $table->dropColumn('ch_payment_id');
            });
        }
    }
};
