<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_supplier_chat_messages', function (Blueprint $table): void {
            $table->string('attachment_url', 2048)->nullable()->after('message');
            $table->string('attachment_type', 20)->nullable()->after('attachment_url'); // image | video | file
            $table->string('attachment_name', 255)->nullable()->after('attachment_type');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_supplier_chat_messages', function (Blueprint $table): void {
            $table->dropColumn(['attachment_url', 'attachment_type', 'attachment_name']);
        });
    }
};
