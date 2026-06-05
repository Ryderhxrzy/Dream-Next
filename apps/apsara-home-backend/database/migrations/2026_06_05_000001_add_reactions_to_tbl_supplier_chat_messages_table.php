<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_supplier_chat_messages', function (Blueprint $table): void {
            $table->json('reactions')->nullable()->after('read_at');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_supplier_chat_messages', function (Blueprint $table): void {
            $table->dropColumn('reactions');
        });
    }
};
