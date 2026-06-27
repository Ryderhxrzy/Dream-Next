<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mobile Home Builder tables.
 *
 * tbl_supplier_brand_home_sections         — one row per section slot on a brand's home page (any type)
 * tbl_supplier_brand_home_banners          — single full-width image + alignment for 'banner' sections
 * tbl_supplier_brand_home_carousel_items   — ordered slide images for 'carousel' sections
 * tbl_supplier_brand_home_product_sections — label / button config for 'products' sections
 * tbl_supplier_brand_home_section_products — the chosen products inside a 'products' section, reorderable
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Sections (master ordering table) ─────────────────────────────
        if (! Schema::hasTable('tbl_supplier_brand_home_sections')) {
            Schema::create('tbl_supplier_brand_home_sections', function (Blueprint $table) {
                $table->bigIncrements('sbhs_id');
                $table->unsignedBigInteger('sbhs_supplier_id');
                $table->unsignedBigInteger('sbhs_brand_id');
                // 'banner' | 'carousel' | 'products'
                $table->string('sbhs_type', 20);
                $table->integer('sbhs_order')->default(0);
                $table->boolean('sbhs_is_active')->default(true);
                $table->timestamps();

                $table->index(['sbhs_supplier_id', 'sbhs_brand_id', 'sbhs_is_active'], 'sbhs_supplier_brand_active_idx');
                $table->index(['sbhs_supplier_id', 'sbhs_brand_id', 'sbhs_order'], 'sbhs_supplier_brand_order_idx');

                $table->foreign('sbhs_brand_id', 'sbhs_brand_fk')
                    ->references('pb_id')
                    ->on('tbl_product_brand')
                    ->onDelete('cascade');
            });
        }

        // ── 2. Banners (one per 'banner' section) ───────────────────────────
        if (! Schema::hasTable('tbl_supplier_brand_home_banners')) {
            Schema::create('tbl_supplier_brand_home_banners', function (Blueprint $table) {
                $table->bigIncrements('sbhb_id');
                $table->unsignedBigInteger('sbhb_section_id');
                $table->text('sbhb_image_url');
                $table->string('sbhb_link_type', 50)->nullable();    // product | category | url | none
                $table->string('sbhb_link_target', 500)->nullable(); // ID or URL
                $table->timestamps();

                $table->index('sbhb_section_id', 'sbhb_section_idx');
                $table->foreign('sbhb_section_id', 'sbhb_section_fk')
                    ->references('sbhs_id')
                    ->on('tbl_supplier_brand_home_sections')
                    ->onDelete('cascade');
            });
        }

        // ── 3. Carousel items (multiple slides per 'carousel' section) ───────
        if (! Schema::hasTable('tbl_supplier_brand_home_carousel_items')) {
            Schema::create('tbl_supplier_brand_home_carousel_items', function (Blueprint $table) {
                $table->bigIncrements('sbhci_id');
                $table->unsignedBigInteger('sbhci_section_id');
                $table->text('sbhci_image_url');
                $table->integer('sbhci_order')->default(0);
                $table->string('sbhci_link_type', 50)->nullable();
                $table->string('sbhci_link_target', 500)->nullable();
                $table->timestamps();

                $table->index(['sbhci_section_id', 'sbhci_order'], 'sbhci_section_order_idx');
                $table->foreign('sbhci_section_id', 'sbhci_section_fk')
                    ->references('sbhs_id')
                    ->on('tbl_supplier_brand_home_sections')
                    ->onDelete('cascade');
            });
        }

        // ── 4. Product section config (label + button for 'products' sections) ─
        if (! Schema::hasTable('tbl_supplier_brand_home_product_sections')) {
            Schema::create('tbl_supplier_brand_home_product_sections', function (Blueprint $table) {
                $table->bigIncrements('sbhps_id');
                $table->unsignedBigInteger('sbhps_section_id');
                $table->string('sbhps_label', 255);                    // section heading shown in-app
                $table->string('sbhps_button_text', 100)->nullable();  // e.g. "View More", "See All"
                $table->string('sbhps_button_link', 500)->nullable();  // deep link or URL for the button
                $table->timestamps();

                $table->index('sbhps_section_id', 'sbhps_section_idx');
                $table->foreign('sbhps_section_id', 'sbhps_section_fk')
                    ->references('sbhs_id')
                    ->on('tbl_supplier_brand_home_sections')
                    ->onDelete('cascade');
            });
        }

        // ── 5. Section products (chosen + ordered products per product section) ─
        if (! Schema::hasTable('tbl_supplier_brand_home_section_products')) {
            Schema::create('tbl_supplier_brand_home_section_products', function (Blueprint $table) {
                $table->bigIncrements('sbhsp_id');
                $table->unsignedBigInteger('sbhsp_product_section_id');
                $table->unsignedBigInteger('sbhsp_product_id');
                $table->integer('sbhsp_order')->default(0);
                $table->timestamps();

                $table->unique(['sbhsp_product_section_id', 'sbhsp_product_id'], 'sbhsp_section_product_unique');
                $table->index(['sbhsp_product_section_id', 'sbhsp_order'], 'sbhsp_section_order_idx');

                $table->foreign('sbhsp_product_section_id', 'sbhsp_product_section_fk')
                    ->references('sbhps_id')
                    ->on('tbl_supplier_brand_home_product_sections')
                    ->onDelete('cascade');

                $table->foreign('sbhsp_product_id', 'sbhsp_product_fk')
                    ->references('pd_id')
                    ->on('tbl_product')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_supplier_brand_home_section_products');
        Schema::dropIfExists('tbl_supplier_brand_home_product_sections');
        Schema::dropIfExists('tbl_supplier_brand_home_carousel_items');
        Schema::dropIfExists('tbl_supplier_brand_home_banners');
        Schema::dropIfExists('tbl_supplier_brand_home_sections');
    }
};
