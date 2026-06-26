<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_supplier_push_notifications', function (Blueprint $table) {
            // Scheduling type: 'once', 'daily', 'weekly', 'monthly'
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_schedule_type')) {
                $table->string('spn_schedule_type')->default('once')->after('spn_button_text');
            }

            // Scheduling configuration (JSON: contains time, days, frequency, interval, etc.)
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_schedule_config')) {
                $table->json('spn_schedule_config')->nullable()->after('spn_schedule_type');
            }

            // Timezone for scheduling (e.g., 'UTC', 'Asia/Manila', 'America/New_York')
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_timezone')) {
                $table->string('spn_timezone')->default('UTC')->after('spn_schedule_config');
            }

            // Status: active, paused, completed, cancelled
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_status')) {
                $table->string('spn_status')->default('active')->after('spn_timezone');
            }

            // Next scheduled send time
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_next_scheduled_at')) {
                $table->timestamp('spn_next_scheduled_at')->nullable()->after('spn_status');
            }

            // Last sent time (for recurring notifications)
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_last_sent_at')) {
                $table->timestamp('spn_last_sent_at')->nullable()->after('spn_next_scheduled_at');
            }

            // Total number of times to send (null = infinite)
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_send_limit')) {
                $table->integer('spn_send_limit')->nullable()->after('spn_last_sent_at');
            }

            // Number of times already sent
            if (!Schema::hasColumn('tbl_supplier_push_notifications', 'spn_send_count')) {
                $table->integer('spn_send_count')->default(0)->after('spn_send_limit');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbl_supplier_push_notifications', function (Blueprint $table) {
            // Drop indexes if they exist
            try {
                $table->dropIndex('idx_spn_status');
            } catch (\Exception $e) {
                // Index doesn't exist, ignore
            }

            try {
                $table->dropIndex('idx_spn_next_scheduled');
            } catch (\Exception $e) {
                // Index doesn't exist, ignore
            }

            try {
                $table->dropIndex('idx_spn_status_scheduled');
            } catch (\Exception $e) {
                // Index doesn't exist, ignore
            }

            try {
                $table->dropIndex('idx_spn_timezone');
            } catch (\Exception $e) {
                // Index doesn't exist, ignore
            }

            // Drop columns if they exist
            $columnsToCheck = [
                'spn_schedule_type',
                'spn_schedule_config',
                'spn_timezone',
                'spn_status',
                'spn_next_scheduled_at',
                'spn_last_sent_at',
                'spn_send_limit',
                'spn_send_count',
            ];

            $columnsToDrops = [];
            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('tbl_supplier_push_notifications', $column)) {
                    $columnsToDrops[] = $column;
                }
            }

            if (!empty($columnsToDrops)) {
                $table->dropColumn($columnsToDrops);
            }
        });
    }
};
