<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
        }

        Schema::create('tbl_ai_knowledge_documents', function (Blueprint $table) {
            $table->bigIncrements('doc_id');
            $table->string('doc_title', 180);
            $table->string('doc_type', 40)->default('faq');
            $table->string('doc_scope', 40)->default('global');
            $table->string('doc_partner_slug', 160)->nullable();
            $table->string('doc_status', 30)->default('active');
            $table->string('doc_index_status', 40)->default('pending');
            $table->longText('doc_content');
            $table->json('doc_metadata')->nullable();
            $table->unsignedBigInteger('doc_created_by_admin_id')->nullable();
            $table->timestamp('doc_indexed_at')->nullable();
            $table->text('doc_index_error')->nullable();
            $table->timestamps();

            $table->index(['doc_status', 'doc_scope']);
            $table->index('doc_partner_slug');
            $table->index('doc_type');
        });

        Schema::create('tbl_ai_knowledge_chunks', function (Blueprint $table) use ($driver) {
            $table->bigIncrements('kc_id');
            $table->unsignedBigInteger('kc_document_id');
            $table->unsignedInteger('kc_chunk_index');
            $table->text('kc_content');
            $table->string('kc_hash', 64);
            $table->unsignedInteger('kc_token_estimate')->default(0);
            $table->json('kc_embedding_json')->nullable();
            $table->json('kc_metadata')->nullable();
            $table->timestamp('kc_indexed_at')->nullable();
            $table->timestamps();

            $table->foreign('kc_document_id')
                ->references('doc_id')
                ->on('tbl_ai_knowledge_documents')
                ->cascadeOnDelete();
            $table->unique(['kc_document_id', 'kc_chunk_index']);
            $table->index('kc_hash');

            if ($driver !== 'pgsql') {
                $table->longText('kc_embedding')->nullable();
            }
        });

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE tbl_ai_knowledge_chunks ADD COLUMN kc_embedding vector(768)');
            DB::statement(
                'CREATE INDEX tbl_ai_knowledge_chunks_embedding_idx ON tbl_ai_knowledge_chunks USING ivfflat (kc_embedding vector_cosine_ops) WITH (lists = 100)'
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_ai_knowledge_chunks');
        Schema::dropIfExists('tbl_ai_knowledge_documents');
    }
};
