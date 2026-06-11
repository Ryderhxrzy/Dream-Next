<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_daily_checkins')) {
            return;
        }

        Schema::create('tbl_daily_checkins', function (Blueprint $table) {
            $table->bigIncrements('dc_id');
            $table->unsignedBigInteger('dc_customer_id');
            $table->date('dc_checkin_date');
            $table->date('dc_cycle_start')->nullable();
            $table->unsignedTinyInteger('dc_day_index')->default(1);
            $table->decimal('dc_amount', 12, 2)->default(0);
            $table->unsignedInteger('dc_streak')->default(1);
            $table->unsignedBigInteger('dc_ledger_id')->nullable();
            $table->string('dc_source_type', 50)->default('daily_checkin');
            $table->timestamps();

            // One check-in per customer per calendar day (idempotency guard).
            $table->unique(['dc_customer_id', 'dc_checkin_date'], 'dc_customer_date_unique');
            $table->index(['dc_customer_id', 'dc_cycle_start'], 'dc_customer_cycle_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_daily_checkins');
    }
};
