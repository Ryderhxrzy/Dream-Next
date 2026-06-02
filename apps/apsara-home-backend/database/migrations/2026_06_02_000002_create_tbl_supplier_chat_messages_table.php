<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_supplier_chat_messages')) {
            return;
        }

        Schema::create('tbl_supplier_chat_messages', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('conversation_id');
            $table->enum('sender_type', ['admin', 'supplier']);
            $table->unsignedBigInteger('sender_admin_id')->nullable();
            $table->unsignedBigInteger('sender_supplier_user_id')->nullable();
            $table->longText('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('conversation_id')
                ->references('id')
                ->on('tbl_supplier_chat_conversations')
                ->onDelete('cascade');

            $table->index('conversation_id', 'idx_supplier_chat_messages_conversation_id');
            $table->index('sender_type', 'idx_supplier_chat_messages_sender_type');
            $table->index('sender_admin_id', 'idx_supplier_chat_messages_sender_admin_id');
            $table->index('sender_supplier_user_id', 'idx_supplier_chat_messages_sender_supplier_user_id');
            $table->index('read_at', 'idx_supplier_chat_messages_read_at');
            $table->index(['conversation_id', 'created_at'], 'idx_supplier_chat_messages_conversation_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_supplier_chat_messages');
    }
};
