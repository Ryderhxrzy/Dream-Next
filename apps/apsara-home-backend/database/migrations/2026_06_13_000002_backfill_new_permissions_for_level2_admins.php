<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Permissions added to permissionForPath() that did not exist when level-2 admins were first created. */
    private const NEW_PERMISSIONS = ['payments', 'expenses', 'email_blast', 'conversations', 'settings'];

    public function up(): void
    {
        $rows = DB::table('tbl_admin')->where('user_level_id', 2)->get(['id', 'admin_permissions']);

        foreach ($rows as $row) {
            $current = is_string($row->admin_permissions)
                ? (json_decode($row->admin_permissions, true) ?? [])
                : [];

            if (! is_array($current)) {
                $current = [];
            }

            $missing = array_diff(self::NEW_PERMISSIONS, $current);

            if (empty($missing)) {
                continue;
            }

            $updated = array_values(array_merge($current, $missing));

            DB::table('tbl_admin')
                ->where('id', $row->id)
                ->update(['admin_permissions' => json_encode($updated)]);
        }
    }

    public function down(): void
    {
        $rows = DB::table('tbl_admin')->where('user_level_id', 2)->get(['id', 'admin_permissions']);

        foreach ($rows as $row) {
            $current = is_string($row->admin_permissions)
                ? (json_decode($row->admin_permissions, true) ?? [])
                : [];

            if (! is_array($current)) {
                continue;
            }

            $stripped = array_values(array_diff($current, self::NEW_PERMISSIONS));

            DB::table('tbl_admin')
                ->where('id', $row->id)
                ->update(['admin_permissions' => json_encode($stripped)]);
        }
    }
};
