<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Same root cause as tbl_supplier.s_id: tbl_supplier_user.su_id is an
     * identity column with no unique constraint and a sequence that fell behind
     * the data (last_value=4 while MAX(su_id)=35), so accepting merchant invites
     * would create colliding su_id rows. Renumber the duplicate (later) rows,
     * resync the sequence, and enforce uniqueness.
     */
    public function up(): void
    {
        if (! Schema::hasTable('tbl_supplier_user')) {
            return;
        }

        DB::transaction(function () {
            DB::statement(
                'WITH ranked AS ('
                . ' SELECT ctid, ROW_NUMBER() OVER (PARTITION BY su_id ORDER BY ctid) AS rn'
                . ' FROM tbl_supplier_user'
                . '), base AS ('
                . ' SELECT COALESCE(MAX(su_id), 0) AS m FROM tbl_supplier_user'
                . '), to_fix AS ('
                . ' SELECT r.ctid,'
                . '        (SELECT m FROM base) + ROW_NUMBER() OVER (ORDER BY r.ctid) AS new_id'
                . ' FROM ranked r'
                . ' WHERE r.rn > 1'
                . ')'
                . ' UPDATE tbl_supplier_user s'
                . ' SET su_id = f.new_id'
                . ' FROM to_fix f'
                . ' WHERE s.ctid = f.ctid'
            );

            DB::statement(
                "SELECT setval("
                . "pg_get_serial_sequence('tbl_supplier_user', 'su_id'),"
                . " (SELECT MAX(su_id) FROM tbl_supplier_user)"
                . ")"
            );
        });

        $hasUnique = DB::selectOne(
            "SELECT 1 AS ok FROM pg_constraint"
            . " WHERE conrelid = 'tbl_supplier_user'::regclass"
            . " AND contype IN ('p', 'u')"
            . " AND conname = 'tbl_supplier_user_su_id_unique'"
        );

        if (! $hasUnique) {
            DB::statement('ALTER TABLE tbl_supplier_user ADD CONSTRAINT tbl_supplier_user_su_id_unique UNIQUE (su_id)');
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE tbl_supplier_user DROP CONSTRAINT IF EXISTS tbl_supplier_user_su_id_unique');
    }
};
