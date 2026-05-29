<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tbl_supplier_push_notifications')) {
            Schema::create('tbl_supplier_push_notifications', function (Blueprint $table) {
                $table->bigIncrements('spn_id');
                $table->unsignedBigInteger('spn_supplier_id');
                $table->string('spn_title', 255);
                $table->text('spn_body');
                $table->string('spn_image', 1000)->nullable();
                $table->json('spn_recipients')->comment('Array of customer IDs for notification recipients');
                $table->integer('spn_sent_count')->default(0);
                $table->integer('spn_failed_count')->default(0);
                $table->timestamp('spn_sent_at')->nullable();
                $table->timestamp('spn_created_at')->nullable();
                $table->timestamp('spn_updated_at')->nullable();

                $table->index('spn_supplier_id', 'idx_spn_supplier');
                $table->index('spn_created_at', 'idx_spn_created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_supplier_push_notifications');
    }
};
