<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_messages', function (Blueprint $table) {
            // Persist the sender's role at WRITE time so bubble side never relies on
            // ambiguous cross-table id comparison (admin.id can collide with a
            // customer's c_userid). 'customer' | 'admin'.
            $table->string('sender_type', 20)->default('customer')->after('sender_id');
        });

        // Backfill existing rows from the per-conversation rule.
        DB::statement(
            "UPDATE tbl_messages m
             JOIN tbl_conversations c ON c.id = m.conversation_id
             SET m.sender_type = CASE WHEN m.sender_id = c.user_id THEN 'customer' ELSE 'admin' END"
        );
    }

    public function down(): void
    {
        Schema::table('tbl_messages', function (Blueprint $table) {
            $table->dropColumn('sender_type');
        });
    }
};
