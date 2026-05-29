<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_supplier_push_notifications')) {
            Schema::table('tbl_supplier_push_notifications', function (Blueprint $table) {
                if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_scheduled_at')) {
                    $table->timestamp('spn_scheduled_at')->nullable()->after('spn_sent_at');
                }
                if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_status')) {
                    $table->enum('spn_status', ['pending', 'scheduled', 'sent', 'failed'])->default('pending')->after('spn_scheduled_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tbl_supplier_push_notifications')) {
            Schema::table('tbl_supplier_push_notifications', function (Blueprint $table) {
                if (Schema::hasColumn('tbl_supplier_push_notifications', 'spn_scheduled_at')) {
                    $table->dropColumn('spn_scheduled_at');
                }
                if (Schema::hasColumn('tbl_supplier_push_notifications', 'spn_status')) {
                    $table->dropColumn('spn_status');
                }
            });
        }
    }
};
