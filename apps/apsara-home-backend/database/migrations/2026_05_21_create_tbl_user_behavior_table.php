<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_user_behavior')) {
            return;
        }

        Schema::create('tbl_user_behavior', function (Blueprint $table) {
            $table->bigIncrements('ub_id');
            $table->unsignedBigInteger('ub_user_id');
            $table->enum('ub_behavior_type', [
                'search',
                'product_view',
                'product_click',
                'wishlist_add',
                'wishlist_remove',
                'cart_add',
                'cart_remove',
                'purchase',
                'category_view',
                'brand_view'
            ]);
            $table->unsignedBigInteger('ub_product_id')->nullable();
            $table->unsignedBigInteger('ub_category_id')->nullable();
            $table->unsignedBigInteger('ub_brand_id')->nullable();
            $table->string('ub_search_query', 255)->nullable();
            $table->longText('ub_metadata')->nullable(); // JSON data
            $table->timestamps();

            // Foreign keys
            $table->foreign('ub_user_id')
                ->references('c_userid')
                ->on('tbl_customer')
                ->onDelete('cascade');

            // Indexes for fast queries
            $table->index(['ub_user_id'], 'ub_user_id_idx');
            $table->index(['ub_behavior_type'], 'ub_behavior_type_idx');
            $table->index(['created_at'], 'ub_created_at_idx');
            $table->index(['ub_user_id', 'ub_behavior_type'], 'ub_user_behavior_idx');
            $table->index(['ub_product_id'], 'ub_product_id_idx');
            $table->index(['ub_category_id'], 'ub_category_id_idx');
            $table->index(['ub_brand_id'], 'ub_brand_id_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_user_behavior');
    }
};
