<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tbl_qa_test_statuses')) {
            Schema::create('tbl_qa_test_statuses', function (Blueprint $table): void {
                $table->bigIncrements('qts_id');
                $table->string('qts_test_id', 64);
                $table->string('qts_status', 16)->default('pending');
                $table->text('qts_note')->nullable();
                $table->string('qts_updated_by', 191)->nullable();
                $table->timestamps();

                $table->unique('qts_test_id', 'uq_tbl_qa_test_statuses_test_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_qa_test_statuses');
    }
};
