<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_order_cancellations', function (Blueprint $table) {
            $table->id('oc_id');
            $table->unsignedBigInteger('oc_order_id')->comment('FK to tbl_checkout_history');
            $table->unsignedBigInteger('oc_customer_id')->comment('FK to customers');
            $table->string('oc_cancellation_reason', 50)->nullable()->comment('Reason key: changed_mind, found_better_price, item_out_of_stock, etc.');
            $table->string('oc_reason_label', 255)->nullable()->comment('Human readable reason label');
            $table->text('oc_cancellation_notes')->nullable()->comment('Additional notes from customer');
            $table->decimal('oc_refund_amount', 12, 2)->comment('Amount to be refunded');
            $table->string('oc_refund_status', 50)->default('pending')->comment('pending, processing, completed, failed');
            $table->string('oc_refund_id', 255)->nullable()->comment('PayMongo refund ID');
            $table->timestamp('oc_cancelled_at')->nullable()->comment('When order was cancelled');
            $table->timestamp('oc_refund_processed_at')->nullable()->comment('When refund was processed');
            $table->timestamps();

            $table->foreign('oc_order_id')
                ->references('ch_id')
                ->on('tbl_checkout_history')
                ->onDelete('cascade');

            $table->foreign('oc_customer_id')
                ->references('c_userid')
                ->on('tbl_customer')
                ->onDelete('cascade');

            $table->index('oc_order_id');
            $table->index('oc_customer_id');
            $table->index('oc_refund_status');
            $table->index('oc_cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_order_cancellations');
    }
};
