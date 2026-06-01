<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('tbl_supplier_mobile_home_section_images');
        Schema::dropIfExists('tbl_supplier_mobile_home_products');
        Schema::dropIfExists('tbl_supplier_mobile_home_sections');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('tbl_supplier_mobile_home_sections', function (Blueprint $table) {
            $table->bigIncrements('smhs_id');
            $table->unsignedBigInteger('smhs_supplier_id');
            $table->string('smhs_section_type', 50);
            $table->string('smhs_section_title', 255)->nullable();
            $table->integer('smhs_section_order')->default(0);
            $table->boolean('smhs_is_active')->default(true);
            $table->json('smhs_config')->nullable();
            $table->timestamps();

            $table->index(['smhs_supplier_id', 'smhs_is_active'], 'smhs_supplier_active_idx');
            $table->index(['smhs_supplier_id', 'smhs_section_order'], 'smhs_supplier_order_idx');
        });

        Schema::create('tbl_supplier_mobile_home_section_images', function (Blueprint $table) {
            $table->bigIncrements('smhsi_id');
            $table->unsignedBigInteger('smhsi_section_id');
            $table->text('smhsi_image_url');
            $table->integer('smhsi_image_order')->default(0);
            $table->string('smhsi_link_type', 50)->nullable();
            $table->string('smhsi_link_target', 500)->nullable();
            $table->string('smhsi_alt_text', 255)->nullable();
            $table->timestamps();

            $table->index(['smhsi_section_id', 'smhsi_image_order'], 'smhsi_section_order_idx');
            $table->foreign('smhsi_section_id')
                ->references('smhs_id')
                ->on('tbl_supplier_mobile_home_sections')
                ->onDelete('cascade');
        });

        Schema::create('tbl_supplier_mobile_home_products', function (Blueprint $table) {
            $table->bigIncrements('smhp_id');
            $table->unsignedBigInteger('smhp_section_id');
            $table->unsignedBigInteger('smhp_product_id');
            $table->integer('smhp_product_order')->default(0);
            $table->timestamps();

            $table->index(['smhp_section_id', 'smhp_product_order'], 'smhp_section_order_idx');
            $table->unique(['smhp_section_id', 'smhp_product_id'], 'smhp_section_product_unique');
            $table->foreign('smhp_section_id')
                ->references('smhs_id')
                ->on('tbl_supplier_mobile_home_sections')
                ->onDelete('cascade');
        });
    }
};
