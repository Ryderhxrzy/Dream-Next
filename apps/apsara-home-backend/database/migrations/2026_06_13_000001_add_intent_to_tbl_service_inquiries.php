<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_service_inquiries', function (Blueprint $table): void {
            $table->text('intent')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_service_inquiries', function (Blueprint $table): void {
            $table->dropColumn('intent');
        });
    }
};
