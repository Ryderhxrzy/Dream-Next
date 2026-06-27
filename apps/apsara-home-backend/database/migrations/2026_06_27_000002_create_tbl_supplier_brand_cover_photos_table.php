<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brand profile cover photo.
 *
 * tbl_supplier_brand_cover_photos — one row per brand: the wide cover image
 * shown behind the brand profile header in the mobile app. A brand has at most
 * one cover photo (sbcp_brand_id is unique).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tbl_supplier_brand_cover_photos')) {
            Schema::create('tbl_supplier_brand_cover_photos', function (Blueprint $table) {
                $table->bigIncrements('sbcp_id');
                $table->unsignedBigInteger('sbcp_supplier_id');
                $table->unsignedBigInteger('sbcp_brand_id');
                $table->text('sbcp_image_url');
                $table->timestamps();

                // One cover photo per brand.
                $table->unique('sbcp_brand_id', 'sbcp_brand_unique');
                $table->index(['sbcp_supplier_id', 'sbcp_brand_id'], 'sbcp_supplier_brand_idx');

                $table->foreign('sbcp_brand_id', 'sbcp_brand_fk')
                    ->references('pb_id')
                    ->on('tbl_product_brand')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_supplier_brand_cover_photos');
    }
};
