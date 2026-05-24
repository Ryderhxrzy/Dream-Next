<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_zq_category_mappings')) {
            return;
        }

        Schema::create('tbl_zq_category_mappings', function (Blueprint $table) {
            $table->bigIncrements('zqcm_id');
            $table->string('zq_category_id', 64)->nullable();
            $table->string('zq_category_name', 255);
            $table->string('zq_category_key', 255)->unique();
            $table->unsignedBigInteger('local_category_id')->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->index('zq_category_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_zq_category_mappings');
    }
};
