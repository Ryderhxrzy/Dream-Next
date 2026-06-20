<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * tbl_supplier.s_id is an identity column but had NO unique/primary-key
     * constraint, and its sequence had fallen behind the imported rows. New
     * merchants therefore reused ids 1-9 that already existed (e.g. "Huawei"
     * collided with "Sunnyware" on s_id=9), so an invite for one merchant
     * resolved to the other.
     *
     * Repair: keep the earliest row per s_id (the original, which owns any
     * related records) and renumber the later duplicate rows to fresh ids,
     * then resync the sequence and enforce uniqueness.
     */
    public function up(): void
    {
        DB::transaction(function () {
            DB::statement(
                'WITH ranked AS ('
                . ' SELECT ctid, ROW_NUMBER() OVER (PARTITION BY s_id ORDER BY ctid) AS rn'
                . ' FROM tbl_supplier'
                . '), base AS ('
                . ' SELECT COALESCE(MAX(s_id), 0) AS m FROM tbl_supplier'
                . '), to_fix AS ('
                . ' SELECT r.ctid,'
                . '        (SELECT m FROM base) + ROW_NUMBER() OVER (ORDER BY r.ctid) AS new_id'
                . ' FROM ranked r'
                . ' WHERE r.rn > 1'
                . ')'
                . ' UPDATE tbl_supplier s'
                . ' SET s_id = f.new_id'
                . ' FROM to_fix f'
                . ' WHERE s.ctid = f.ctid'
            );

            DB::statement(
                "SELECT setval("
                . "pg_get_serial_sequence('tbl_supplier', 's_id'),"
                . " (SELECT MAX(s_id) FROM tbl_supplier)"
                . ")"
            );
        });

        $hasUnique = DB::selectOne(
            "SELECT 1 AS ok FROM pg_constraint"
            . " WHERE conrelid = 'tbl_supplier'::regclass"
            . " AND contype IN ('p', 'u')"
            . " AND conname = 'tbl_supplier_s_id_unique'"
        );

        if (! $hasUnique) {
            DB::statement('ALTER TABLE tbl_supplier ADD CONSTRAINT tbl_supplier_s_id_unique UNIQUE (s_id)');
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE tbl_supplier DROP CONSTRAINT IF EXISTS tbl_supplier_s_id_unique');
        // The id renumbering is intentionally not reversed.
    }
};
