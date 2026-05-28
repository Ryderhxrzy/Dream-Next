<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbl_system_settings', function (Blueprint $table) {
            $table->boolean('registration_otp_enabled')->default(true)->after('enable_2fa');
            $table->boolean('strict_password_policy')->default(true)->after('registration_otp_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('tbl_system_settings', function (Blueprint $table) {
            $table->dropColumn(['registration_otp_enabled', 'strict_password_policy']);
        });
    }
};
