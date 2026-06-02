<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_supplier_chat_conversations')) {
            return;
        }

        Schema::create('tbl_supplier_chat_conversations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('supplier_user_id');
            $table->unsignedBigInteger('assigned_admin_id')->nullable();
            $table->enum('status', ['open', 'pending', 'resolved'])->default('open');
            $table->string('subject')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index('supplier_user_id', 'idx_supplier_chat_conversations_supplier_user_id');
            $table->index('assigned_admin_id', 'idx_supplier_chat_conversations_assigned_admin_id');
            $table->index('status', 'idx_supplier_chat_conversations_status');
            $table->index(['supplier_user_id', 'status'], 'idx_supplier_chat_conversations_supplier_status');
            $table->index(['supplier_user_id', 'last_message_at'], 'idx_supplier_chat_conversations_supplier_last_message');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_supplier_chat_conversations');
    }
};
