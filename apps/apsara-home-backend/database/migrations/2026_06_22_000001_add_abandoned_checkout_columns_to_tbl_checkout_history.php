<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tbl_checkout_history')) {
            return;
        }

        Schema::table('tbl_checkout_history', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_checkout_history', 'ch_checkout_url')) {
                // Resumable PayMongo checkout URL captured at session creation so
                // recovery reminders can link the customer back to finish paying.
                $table->text('ch_checkout_url')->nullable()->after('ch_checkout_id');
            }

            if (!Schema::hasColumn('tbl_checkout_history', 'ch_abandoned_at')) {
                $table->timestamp('ch_abandoned_at')->nullable()->after('ch_paid_at');
            }

            if (!Schema::hasColumn('tbl_checkout_history', 'ch_reminder_count')) {
                $table->unsignedSmallInteger('ch_reminder_count')->default(0)->after('ch_abandoned_at');
            }

            if (!Schema::hasColumn('tbl_checkout_history', 'ch_last_reminder_at')) {
                $table->timestamp('ch_last_reminder_at')->nullable()->after('ch_reminder_count');
            }
        });

        // Speeds up the recurring abandoned-checkout scans (unpaid + aged).
        try {
            Schema::table('tbl_checkout_history', function (Blueprint $table) {
                $table->index(['ch_paid_at', 'ch_status', 'created_at'], 'tbl_checkout_history_abandoned_idx');
            });
        } catch (\Throwable $e) {
            // Index already exists (re-run) — safe to ignore.
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('tbl_checkout_history')) {
            return;
        }

        try {
            Schema::table('tbl_checkout_history', function (Blueprint $table) {
                $table->dropIndex('tbl_checkout_history_abandoned_idx');
            });
        } catch (\Throwable $e) {
            // Index missing — safe to ignore.
        }

        Schema::table('tbl_checkout_history', function (Blueprint $table) {
            foreach (['ch_checkout_url', 'ch_abandoned_at', 'ch_reminder_count', 'ch_last_reminder_at'] as $column) {
                if (Schema::hasColumn('tbl_checkout_history', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
