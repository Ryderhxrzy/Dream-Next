<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tbl_customer') || Schema::hasColumn('tbl_customer', 'c_profile_reward_modal_seen')) {
            return;
        }

        Schema::table('tbl_customer', function (Blueprint $table) {
            $table->boolean('c_profile_reward_modal_seen')->default(false);
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('tbl_customer') || !Schema::hasColumn('tbl_customer', 'c_profile_reward_modal_seen')) {
            return;
        }

        Schema::table('tbl_customer', function (Blueprint $table) {
            $table->dropColumn('c_profile_reward_modal_seen');
        });
    }
};
