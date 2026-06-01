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
        Schema::table('tbl_supplier_push_notifications', function (Blueprint $table) {
            $table->string('spn_button_text')->nullable()->after('spn_image');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbl_supplier_push_notifications', function (Blueprint $table) {
            $table->dropColumn('spn_button_text');
        });
    }
};
