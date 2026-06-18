<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_supplier_chat_messages', function (Blueprint $table) {
            $table->string('sender_name')->nullable()->after('sender_supplier_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_supplier_chat_messages', function (Blueprint $table) {
            $table->dropColumn('sender_name');
        });
    }
};
