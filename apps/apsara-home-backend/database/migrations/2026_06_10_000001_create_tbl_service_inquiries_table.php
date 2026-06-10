<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_service_inquiries')) {
            return;
        }

        Schema::create('tbl_service_inquiries', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('supplier_id');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('fullname');
            $table->string('email');
            $table->string('contact', 50);
            $table->text('address');
            $table->enum('status', ['new', 'viewed', 'responded', 'closed'])->default('new');
            $table->timestamps();

            $table->index('product_id',  'idx_service_inquiries_product_id');
            $table->index('supplier_id', 'idx_service_inquiries_supplier_id');
            $table->index('customer_id', 'idx_service_inquiries_customer_id');
            $table->index('status',      'idx_service_inquiries_status');
            $table->index(['supplier_id', 'status'], 'idx_service_inquiries_supplier_status');
            $table->index(['supplier_id', 'created_at'], 'idx_service_inquiries_supplier_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_service_inquiries');
    }
};
