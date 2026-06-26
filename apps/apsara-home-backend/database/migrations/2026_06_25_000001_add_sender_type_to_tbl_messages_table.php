<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent: a previous attempt may have rolled back mid-way.
        if (!Schema::hasColumn('tbl_messages', 'sender_type')) {
            Schema::table('tbl_messages', function (Blueprint $table) {
                // Persist the sender's role at WRITE time so bubble side never relies
                // on ambiguous cross-table id comparison (admin.id can collide with a
                // customer's c_userid). 'customer' | 'admin'.
                $table->string('sender_type', 20)->default('customer')->after('sender_id');
            });
        }

        // Backfill existing rows from the per-conversation rule. Uses a correlated
        // subquery (NOT UPDATE..JOIN) so it runs on BOTH PostgreSQL (production) and
        // MySQL — the JOIN form is MySQL-only and errors on Postgres.
        DB::statement(
            "UPDATE tbl_messages
             SET sender_type = CASE
                 WHEN sender_id = (
                     SELECT user_id FROM tbl_conversations
                     WHERE tbl_conversations.id = tbl_messages.conversation_id
                 ) THEN 'customer'
                 ELSE 'admin'
             END"
        );
    }

    public function down(): void
    {
        Schema::table('tbl_messages', function (Blueprint $table) {
            $table->dropColumn('sender_type');
        });
    }
};
