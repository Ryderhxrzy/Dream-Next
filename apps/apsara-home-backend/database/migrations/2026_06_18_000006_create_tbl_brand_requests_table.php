<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Merchants (supplier-portal users) can't create brands directly — only
     * admins can. This table holds their "please add this brand" requests, which
     * an admin reviews and approves (auto-creating the merchant-owned brand) or
     * rejects with a reason.
     */
    public function up(): void
    {
        if (Schema::hasTable('tbl_brand_requests')) {
            return;
        }

        Schema::create('tbl_brand_requests', function (Blueprint $table) {
            $table->bigIncrements('br_id');
            $table->integer('br_supplier_id'); // requesting merchant (tbl_supplier.s_id)
            $table->string('br_name', 105);
            $table->string('br_image', 1000)->nullable();
            $table->text('br_note')->nullable();
            $table->string('br_status', 20)->default('pending'); // pending | approved | rejected
            $table->text('br_admin_reason')->nullable();
            $table->integer('br_created_brand_id')->nullable(); // pb_id created on approval
            $table->integer('br_handled_by')->nullable(); // admin id who decided
            $table->boolean('br_seen_by_merchant')->default(true); // false after a decision, until the merchant views it
            $table->timestamp('br_decided_at')->nullable();
            $table->timestamps();

            $table->index('br_supplier_id', 'tbl_brand_requests_supplier_idx');
            $table->index('br_status', 'tbl_brand_requests_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_brand_requests');
    }
};
